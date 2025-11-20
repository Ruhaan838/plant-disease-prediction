"""Dataset utilities: optional Kaggle download + dataloader creation.

This module tries to use `kagglehub` if available (per your snippet) to
download the dataset. If not available, it assumes the dataset is already
extracted under `data_dir` in a structure compatible with
`torchvision.datasets.ImageFolder` (class-per-folder).

It provides `prepare_dataloaders` which returns train/val/test loaders
and the class names mapping.
"""
from pathlib import Path
from typing import Tuple
import os
import random

from PIL import Image
import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader, Subset
from torchvision.datasets import ImageFolder
from torchvision import transforms
from sklearn.model_selection import train_test_split


def is_image_file(name: str) -> bool:
    return any(name.lower().endswith(ext) for ext in ('.jpg', '.jpeg', '.png', '.bmp'))


def try_download_kaggle(dataset_id: str, dest: str) -> Path:
    """Try to download dataset using `kagglehub.dataset_download` if available.
    Returns Path to extracted dataset or destination where user should place it.
    """
    dest_path = Path(dest)
    dest_path.mkdir(parents=True, exist_ok=True)
    try:
        import kagglehub

        print('Using kagglehub to download dataset', dataset_id)
        path = kagglehub.dataset_download(dataset_id)
        return Path(path)
    except Exception as e:
        print('kagglehub not available or download failed:', e)
        print('Please download the dataset manually to', dest_path)
        return dest_path


class SubsetWithTransform(Dataset):
    def __init__(self, base: ImageFolder, indices, transform=None):
        self.base = base
        self.indices = list(indices)
        self.transform = transform

    def __len__(self):
        return len(self.indices)

    def __getitem__(self, idx):
        sample_idx = self.indices[idx]
        path, target = self.base.samples[sample_idx]
        img = Image.open(path).convert('RGB')
        if self.transform:
            img = self.transform(img)
        return img, target


def prepare_dataloaders(
    data_dir: str,
    img_size: int = 224,
    batch_size: int = 32,
    val_split: float = 0.1,
    test_split: float = 0.1,
    num_workers: int = 4,
    seed: int = 42,
) -> Tuple[DataLoader, DataLoader, DataLoader, list]:
    data_dir = Path(data_dir)
    if not data_dir.exists():
        raise FileNotFoundError(f'data_dir not found: {data_dir}')

    def is_image_dir(p: Path) -> bool:
        # directory that contains at least one image file
        return any(is_image_file(str(x)) for x in p.iterdir() if x.is_file())

    def find_image_root(root: Path, max_depth: int = 3) -> Path:
        """Heuristically find the directory that contains class subfolders.

        Strategy:
        - If `root` has many immediate subdirectories which themselves contain images,
          prefer that.
        - Otherwise, walk up to `max_depth` and pick the directory with the most
          candidate class subfolders (each subfolder must contain at least one image).
        """
        # check immediate children
        children = [p for p in root.iterdir() if p.is_dir()]
        class_dirs = [p for p in children if any(is_image_file(str(x)) for x in p.iterdir())]
        if len(class_dirs) >= 2:
            return root

        # search deeper up to max_depth
        best = root
        best_count = 0
        for dirpath, dirnames, filenames in os.walk(root):
            depth = Path(dirpath).relative_to(root).parts
            if len(depth) > max_depth:
                continue
            p = Path(dirpath)
            # count immediate subdirs that contain images
            subs = [sd for sd in (p.iterdir() if p.exists() else []) if sd.is_dir()]
            cnt = 0
            for sd in subs:
                if any(is_image_file(str(x)) for x in sd.rglob('*')):
                    cnt += 1
            if cnt > best_count:
                best_count = cnt
                best = p

        return best

    # find best image root automatically and inform the user
    chosen_root = find_image_root(data_dir)
    if chosen_root != data_dir:
        print(f'Using detected dataset root: {chosen_root} (passed {data_dir})')
    data_dir = chosen_root

    # Basic transforms
    train_tf = transforms.Compose([
        transforms.RandomResizedCrop(img_size),
        transforms.RandomHorizontalFlip(),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    val_tf = transforms.Compose([
        transforms.Resize(int(img_size * 1.14)),
        transforms.CenterCrop(img_size),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    # If folder contains train/val/test subfolders, prefer that structure
    if (data_dir / 'train').exists():
        print('Detected train/ subfolder structure under', data_dir)
        train_ds = ImageFolder(str(data_dir / 'train'), transform=train_tf)
        if (data_dir / 'val').exists():
            val_ds = ImageFolder(str(data_dir / 'val'), transform=val_tf)
        else:
            val_ds = ImageFolder(str(data_dir / 'train'), transform=val_tf)
        if (data_dir / 'test').exists():
            test_ds = ImageFolder(str(data_dir / 'test'), transform=val_tf)
        else:
            test_ds = val_ds
        class_names = train_ds.classes
        train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True, num_workers=num_workers)
        val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False, num_workers=num_workers)
        test_loader = DataLoader(test_ds, batch_size=batch_size, shuffle=False, num_workers=num_workers)
        return train_loader, val_loader, test_loader, class_names

    # Otherwise, use ImageFolder on root and split indices stratified by class
    base = ImageFolder(str(data_dir))
    targets = base.targets
    indices = list(range(len(base)))
    test_size = test_split
    val_size = val_split / (1.0 - test_size) if (val_split + test_split) < 1.0 else 0.0

    train_idx, rest_idx, y_train, y_rest = train_test_split(
        indices, targets, test_size=(val_split + test_split), random_state=seed, stratify=targets
    )

    if test_split > 0:
        relative_test = test_split / (val_split + test_split)
        val_idx, test_idx, _, _ = train_test_split(
            rest_idx, y_rest, test_size=relative_test, random_state=seed, stratify=y_rest
        )
    else:
        val_idx = rest_idx
        test_idx = []

    train_ds = SubsetWithTransform(base, train_idx, transform=train_tf)
    val_ds = SubsetWithTransform(base, val_idx, transform=val_tf)
    test_ds = SubsetWithTransform(base, test_idx, transform=val_tf) if len(test_idx) > 0 else val_ds

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True, num_workers=num_workers)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False, num_workers=num_workers)
    test_loader = DataLoader(test_ds, batch_size=batch_size, shuffle=False, num_workers=num_workers)

    return train_loader, val_loader, test_loader, base.classes

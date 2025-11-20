"""Download the Kaggle dataset and prepare it in ImageFolder layout.

This script attempts to use `kagglehub.dataset_download` (per your snippet)
to download the dataset `goelvanshaj/plant-disease-classification-dataset`.

It extracts archives if needed, heuristically finds the directory containing
the image dataset (class subfolders or many image files), and copies it to
`data/plant-disease-classification-dataset` which is the path expected by
the training scripts.

Usage:
    python scripts/download_and_prepare.py

If `kagglehub` is not installed, the script will print instructions.
"""
from pathlib import Path
import shutil
import zipfile
import tarfile
import tempfile
import sys
import os
import fnmatch


DATASET_ID = "goelvanshaj/plant-disease-classification-dataset"
TARGET_DIR = Path("data") / "plant-disease-classification-dataset"


def is_image_file(name: str) -> bool:
    return any(name.lower().endswith(ext) for ext in ('.jpg', '.jpeg', '.png', '.bmp'))


def count_images_in_dir(d: Path) -> int:
    return sum(1 for _ in d.rglob('*') if is_image_file(str(_)))


def find_best_candidate(root: Path) -> Path:
    """Find the directory under `root` that most likely contains images / class folders.

    Strategy: pick the directory (including root) with the largest number of image files
    but prefer directories that have subdirectories (class-folder layout).
    """
    best = root
    best_count = count_images_in_dir(root)
    # prefer directories with class subfolders
    for p, dirs, files in os.walk(root):
        pth = Path(p)
        c = count_images_in_dir(pth)
        if c > best_count:
            best = pth
            best_count = c
    return best


def extract_archive(path: Path, dest: Path) -> Path:
    dest.mkdir(parents=True, exist_ok=True)
    if zipfile.is_zipfile(path):
        with zipfile.ZipFile(path, 'r') as z:
            z.extractall(dest)
        return dest
    if tarfile.is_tarfile(path):
        with tarfile.open(path, 'r:*') as t:
            t.extractall(dest)
        return dest
    # not an archive
    return path


def copy_tree_preserve(src: Path, dst: Path):
    if dst.exists():
        print('Target exists — removing it:', dst)
        shutil.rmtree(dst)
    print('Copying dataset from', src, '->', dst)
    shutil.copytree(src, dst)


def main():
    print('Preparing dataset — target location:', TARGET_DIR)
    TARGET_DIR.parent.mkdir(parents=True, exist_ok=True)

    try:
        import kagglehub
    except Exception as e:
        print('kagglehub is not installed or could not be imported:', e)
        print('Install it with `pip install kagglehub` or download the dataset manually and place it under', TARGET_DIR)
        sys.exit(1)

    print('Downloading dataset via kagglehub:', DATASET_ID)
    path = kagglehub.dataset_download(DATASET_ID)
    path = Path(path)
    print('Downloaded path:', path)

    # If path is a file (archive), extract to tempdir
    workdir = None
    try:
        if path.is_file():
            tmp = Path(tempfile.mkdtemp(prefix='plant_ds_'))
            print('Extracting archive to', tmp)
            extracted = extract_archive(path, tmp)
            workdir = Path(extracted)
        elif path.is_dir():
            workdir = path
        else:
            print('Downloaded path not found:', path)
            sys.exit(1)

        print('Searching for image dataset in', workdir)
        candidate = find_best_candidate(workdir)
        print('Best candidate for dataset root:', candidate)

        # If candidate contains a few top-level class dirs, copy them directly
        copy_tree_preserve(candidate, TARGET_DIR)

        print('Dataset prepared at', TARGET_DIR)
    finally:
        # don't remove the tmp workdir if it's the same as path
        pass


if __name__ == '__main__':
    main()

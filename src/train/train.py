"""Training script for the plant disease classifier.

Features:
- Loads dataset from a folder (supports ImageFolder structure or a single
  root which will be stratified into train/val/test splits).
- Uses a torchvision model (ResNet18 by default) with optional pretrained weights.
- Checkpointing (best val accuracy) and resume from checkpoint supported.
"""
import argparse
import json
import math
import os
from pathlib import Path

from tqdm import tqdm
from sklearn.metrics import precision_recall_fscore_support, accuracy_score
import csv
import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import models

from src.train.data_utils import prepare_dataloaders


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument('--data-dir', type=str, default='data', help='dataset root (ImageFolder)')
    p.add_argument('--epochs', type=int, default=10)
    p.add_argument('--batch-size', type=int, default=32)
    p.add_argument('--lr', type=float, default=1e-3)
    p.add_argument('--output', type=str, default='checkpoints', help='checkpoint output dir')
    p.add_argument('--model', type=str, default='resnet18', choices=['resnet18', 'resnet50', 'efficientnet_b0'], help='model arch')
    p.add_argument('--img-size', type=int, default=224)
    p.add_argument('--num-workers', type=int, default=4)
    p.add_argument('--pretrained', action='store_true', help='use pretrained weights')
    p.add_argument('--device', type=str, default='auto', help="device to run on: 'auto'|'cuda'|'mps'|'cpu' or specific torch device")
    p.add_argument('--val-split', type=float, default=0.1)
    p.add_argument('--test-split', type=float, default=0.1)
    p.add_argument('--resume', type=str, default=None, help='path to checkpoint to resume')
    return p.parse_args()


def build_model(name: str, num_classes: int, pretrained: bool = True):
    if name == 'resnet18':
        model = models.resnet18(pretrained=pretrained)
        in_features = model.fc.in_features
        model.fc = nn.Linear(in_features, num_classes)
    elif name == 'resnet50':
        model = models.resnet50(pretrained=pretrained)
        in_features = model.fc.in_features
        model.fc = nn.Linear(in_features, num_classes)
    elif name == 'efficientnet_b0':
        model = models.efficientnet_b0(pretrained=pretrained)
        in_features = model.classifier[1].in_features
        model.classifier[1] = nn.Linear(in_features, num_classes)
    else:
        raise ValueError('unknown model: ' + name)
    return model


def resolve_device(device_str: str):
    """Resolve a device string to a torch.device, with MPS support.

    If `device_str` is 'auto' (the default), prefer CUDA, then MPS, then CPU.
    """
    if device_str is None or device_str == 'auto':
        # prefer CUDA
        if torch.cuda.is_available():
            return torch.device('cuda')
        # then try MPS (macOS)
        try:
            if getattr(torch.backends, 'mps', None) is not None and torch.backends.mps.is_available():
                return torch.device('mps')
        except Exception:
            pass
        return torch.device('cpu')
    # user-specified device
    return torch.device(device_str)


def accuracy(outputs, labels):
    _, preds = torch.max(outputs, 1)
    return torch.sum(preds == labels).item() / labels.size(0)


def train(args):
    out_dir = Path(args.output)
    out_dir.mkdir(parents=True, exist_ok=True)

    print('Preparing dataloaders...')
    train_loader, val_loader, test_loader, classes = prepare_dataloaders(
        args.data_dir, img_size=args.img_size, batch_size=args.batch_size, val_split=args.val_split, test_split=args.test_split, num_workers=args.num_workers
    )

    metrics_file = out_dir / 'metrics.csv'

    num_classes = len(classes)
    print(f'Found {num_classes} classes')

    device = torch.device(args.device)
    model = build_model(args.model, num_classes, pretrained=args.pretrained)
    model = model.to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=args.lr)
    scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=7, gamma=0.1)

    start_epoch = 0
    best_val_acc = 0.0
    if args.resume:
        ckpt = torch.load(args.resume, map_location=device)
        model.load_state_dict(ckpt['model_state'])
        optimizer.load_state_dict(ckpt.get('optimizer_state', optimizer.state_dict()))
        start_epoch = ckpt.get('epoch', 0)
        best_val_acc = ckpt.get('best_val_acc', 0.0)
        print(f'Resuming from {args.resume} at epoch {start_epoch}')

    for epoch in range(start_epoch, args.epochs):
        model.train()
        running_loss = 0.0
        train_preds = []
        train_labels = []
        n_samples = 0

        pbar = tqdm(train_loader, desc=f'Epoch {epoch+1}/{args.epochs} [train]', unit='batch')
        for imgs, labels in pbar:
            imgs = imgs.to(device)
            labels = labels.to(device)
            optimizer.zero_grad()
            outputs = model(imgs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            bs = labels.size(0)
            running_loss += loss.item() * bs
            n_samples += bs

            preds = outputs.argmax(1).detach().cpu().numpy()
            train_preds.extend(preds.tolist())
            train_labels.extend(labels.detach().cpu().numpy().tolist())

            pbar.set_postfix({'loss': f'{running_loss / n_samples:.4f}'})
        pbar.close()

        epoch_loss = running_loss / n_samples if n_samples > 0 else 0.0
        epoch_acc = accuracy_score(train_labels, train_preds) if n_samples > 0 else 0.0
        precision, recall, f1, _ = precision_recall_fscore_support(train_labels, train_preds, average='weighted', zero_division=0)
        print(f'Epoch [{epoch+1}/{args.epochs}] Train loss: {epoch_loss:.4f} acc: {epoch_acc:.4f} precision: {precision:.4f} recall: {recall:.4f} f1: {f1:.4f}')

        # validation
        model.eval()
        val_loss = 0.0
        val_preds = []
        val_labels = []
        val_n = 0
        pbar = tqdm(val_loader, desc=f'Epoch {epoch+1}/{args.epochs} [val]', unit='batch')
        with torch.no_grad():
            for imgs, labels in pbar:
                imgs = imgs.to(device)
                labels = labels.to(device)
                outputs = model(imgs)
                loss = criterion(outputs, labels)
                bs = labels.size(0)
                val_loss += loss.item() * bs
                val_n += bs

                preds = outputs.argmax(1).detach().cpu().numpy()
                val_preds.extend(preds.tolist())
                val_labels.extend(labels.detach().cpu().numpy().tolist())
                pbar.set_postfix({'val_loss': f'{val_loss / val_n:.4f}'})
        pbar.close()

        val_loss = val_loss / val_n if val_n > 0 else 0.0
        val_acc = accuracy_score(val_labels, val_preds) if val_n > 0 else 0.0
        v_precision, v_recall, v_f1, _ = precision_recall_fscore_support(val_labels, val_preds, average='weighted', zero_division=0)
        print(f'Validation loss: {val_loss:.4f} acc: {val_acc:.4f} precision: {v_precision:.4f} recall: {v_recall:.4f} f1: {v_f1:.4f}')

        # save metrics to CSV (append)
        header = ['epoch','split','loss','accuracy','precision','recall','f1']
        write_header = not metrics_file.exists()
        with open(metrics_file, 'a', newline='') as csvfile:
            writer = csv.writer(csvfile)
            if write_header:
                writer.writerow(header)
            writer.writerow([epoch+1, 'train', f'{epoch_loss:.6f}', f'{epoch_acc:.6f}', f'{precision:.6f}', f'{recall:.6f}', f'{f1:.6f}'])
            writer.writerow([epoch+1, 'val', f'{val_loss:.6f}', f'{val_acc:.6f}', f'{v_precision:.6f}', f'{v_recall:.6f}', f'{v_f1:.6f}'])

        # checkpoint
        is_best = val_acc > best_val_acc
        if is_best:
            best_val_acc = val_acc
            ckpt_path = out_dir / 'best.pth'
            torch.save({
                'epoch': epoch + 1,
                'model_state': model.state_dict(),
                'optimizer_state': optimizer.state_dict(),
                'best_val_acc': best_val_acc,
                'classes': classes,
            }, ckpt_path)
            print('Saved best checkpoint to', ckpt_path)

        # scheduler step
        scheduler.step()

    print('Training complete. Best val acc:', best_val_acc)


if __name__ == '__main__':
    args = parse_args()
    train(args)

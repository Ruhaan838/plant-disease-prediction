"""Rebuild model with correct number of classes and export to ONNX.

This helper is useful when a checkpoint was saved with the wrong `classes`
metadata (for example the ImageFolder root pointed to a parent folder named
`dataset`), but you already have a trained backbone. It will:

- read class names from `models/classes.json` (or checkpoint if present)
- construct the requested model with `num_classes=len(classes)`
- load checkpoint weights with `strict=False` so final layer size mismatches are ignored
- export the resulting model to ONNX at the given output path

Usage:
    python scripts/rebuild_and_export.py --checkpoint checkpoints/best.pth --output models/model.onnx --model resnet18

Note: the classifier weights will be reinitialized if shapes differ; backbone
weights will still be loaded and give a reasonable demo model without full retraining.
"""
from pathlib import Path
import argparse
import json
import torch
import torch.nn as nn
from torchvision import models


def build_model(name: str, num_classes: int):
    if name == 'resnet18':
        model = models.resnet18(pretrained=False)
        in_features = model.fc.in_features
        model.fc = nn.Linear(in_features, num_classes)
    elif name == 'resnet50':
        model = models.resnet50(pretrained=False)
        in_features = model.fc.in_features
        model.fc = nn.Linear(in_features, num_classes)
    elif name == 'efficientnet_b0':
        model = models.efficientnet_b0(pretrained=False)
        try:
            in_features = model.classifier[1].in_features
            model.classifier[1] = nn.Linear(in_features, num_classes)
        except Exception:
            model.classifier = nn.Sequential(nn.Dropout(0.2), nn.Linear(model.classifier.in_features, num_classes))
    else:
        raise ValueError('unsupported model: ' + name)
    return model


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument('--checkpoint', type=Path, default=Path('checkpoints/best.pth'))
    p.add_argument('--output', type=Path, default=Path('models/model.onnx'))
    p.add_argument('--model', type=str, default='resnet18')
    p.add_argument('--img-size', type=int, default=224)
    return p.parse_args()


def main():
    args = parse_args()
    ckpt_path = args.checkpoint
    out_path = args.output
    model_name = args.model
    img_size = args.img_size

    if not ckpt_path.exists():
        raise FileNotFoundError(ckpt_path)

    ckpt = torch.load(str(ckpt_path), map_location='cpu')
    # try classes in models/classes.json first
    classes_path = Path('models') / 'classes.json'
    if classes_path.exists():
        with open(classes_path, 'r') as f:
            classes = json.load(f)
    else:
        classes = ckpt.get('classes', None)

    if classes is None:
        raise RuntimeError('Could not find class list in models/classes.json or checkpoint')

    num_classes = len(classes)
    print(f'Building {model_name} with num_classes={num_classes}')
    model = build_model(model_name, num_classes)

    state = ckpt.get('model_state', None)
    if state is None:
        # maybe saved raw
        state = ckpt

    # load with strict=False to allow classifier mismatch
    missing, unexpected = model.load_state_dict(state, strict=False)
    print('Loaded checkpoint with strict=False')
    # note: load_state_dict returns None or an exception in older PyTorch; print best-effort

    model.eval()
    dummy = torch.randn(1, 3, img_size, img_size)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    torch.onnx.export(
        model,
        dummy,
        str(out_path),
        opset_version=12,
        input_names=['input'],
        output_names=['output'],
        dynamic_axes={'input': {0: 'batch', 2: 'height', 3: 'width'}, 'output': {0: 'batch'}},
    )
    print('Exported ONNX to', out_path)
    # write classes.json next to ONNX
    classes_out = out_path.parent / 'classes.json'
    with open(classes_out, 'w') as f:
        json.dump(classes, f)
    print('Wrote classes to', classes_out)


if __name__ == '__main__':
    main()

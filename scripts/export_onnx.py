"""Export the best PyTorch checkpoint to ONNX format.

Assumes `checkpoints/best.pth` exists and was saved by the training script.
By default exports to `models/model.onnx` using opset 12 and dynamic batch/height/width.

Usage:
    python scripts/export_onnx.py --checkpoint checkpoints/best.pth --output models/model.onnx
"""
import argparse
from pathlib import Path
import torch
import torch.nn as nn
from torchvision import models


def build_model(name: str, num_classes: int, pretrained: bool = False):
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
        raise ValueError('Unsupported model: ' + name)
    return model


def export(checkpoint_path: Path, output_path: Path, model_name: str = 'resnet18', img_size: int = 224, opset: int = 12):
    if not checkpoint_path.exists():
        raise FileNotFoundError(checkpoint_path)
    ckpt = torch.load(str(checkpoint_path), map_location='cpu')
    classes = ckpt.get('classes', None)
    if classes is None:
        raise RuntimeError('Checkpoint does not contain `classes` metadata')
    num_classes = len(classes)

    model = build_model(model_name, num_classes, pretrained=False)
    model.load_state_dict(ckpt['model_state'])
    model.eval()

    dummy = torch.randn(1, 3, img_size, img_size)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    torch.onnx.export(
        model,
        dummy,
        str(output_path),
        opset_version=opset,
        input_names=['input'],
        output_names=['output'],
        dynamic_axes={'input': {0: 'batch', 2: 'height', 3: 'width'}, 'output': {0: 'batch'}},
    )
    print('Exported ONNX model to', output_path)
    # also save classes.json next to the ONNX so the API/frontend can read labels
    try:
        classes_path = output_path.parent / 'classes.json'
        import json
        classes_path.parent.mkdir(parents=True, exist_ok=True)
        with open(classes_path, 'w') as f:
            json.dump(classes, f)
        print('Wrote classes to', classes_path)
    except Exception as e:
        print('Failed to write classes.json:', e)


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument('--checkpoint', type=Path, default=Path('checkpoints/best.pth'))
    p.add_argument('--output', type=Path, default=Path('models/model.onnx'))
    p.add_argument('--model', type=str, default='resnet18')
    p.add_argument('--img-size', type=int, default=224)
    p.add_argument('--opset', type=int, default=12)
    return p.parse_args()


if __name__ == '__main__':
    args = parse_args()
    export(args.checkpoint, args.output, model_name=args.model, img_size=args.img_size, opset=args.opset)

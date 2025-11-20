"""Run inference using a PyTorch checkpoint (no web server required).

This will build a torchvision model of the chosen architecture, load the
checkpoint (with strict=False so final layer mismatches are tolerated), and
perform inference on a single image.

Usage:
  python scripts/run_inference_pytorch.py --checkpoint checkpoints/best.pth --image img.jpg --model resnet18 --topk 5
"""
import argparse
from pathlib import Path
import json
import torch
import torch.nn as nn
import numpy as np
from PIL import Image
import sys
# ensure project root is on sys.path so `src` package can be imported when running this script directly
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from src.model.utils import preprocess_image_pil
from torchvision import models


def softmax(x: np.ndarray):
    x = x - np.max(x)
    exp = np.exp(x)
    return exp / np.sum(exp)


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
    p.add_argument('--image', type=Path, required=True)
    p.add_argument('--model', type=str, default='resnet18')
    p.add_argument('--topk', type=int, default=5)
    p.add_argument('--img-size', type=int, default=224)
    p.add_argument('--device', type=str, default='cpu')
    return p.parse_args()


def main():
    args = parse_args()
    if not args.checkpoint.exists():
        raise FileNotFoundError(args.checkpoint)
    if not args.image.exists():
        raise FileNotFoundError(args.image)

    ckpt = torch.load(str(args.checkpoint), map_location='cpu')
    classes = ckpt.get('classes', None)
    classes_json = Path('models') / 'classes.json'
    if classes_json.exists():
        with open(classes_json, 'r') as f:
            classes = json.load(f)

    if classes is None:
        raise RuntimeError('No class list in checkpoint or models/classes.json')

    num_classes = len(classes)
    model = build_model(args.model, num_classes)
    state = ckpt.get('model_state', ckpt)
    # load with strict=False so mismatched classifier shapes are OK
    model.load_state_dict(state, strict=False)
    device = torch.device(args.device)
    model.to(device)
    model.eval()

    img = Image.open(str(args.image)).convert('RGB')
    x = preprocess_image_pil(img, size=(args.img_size, args.img_size))
    x = torch.from_numpy(x).unsqueeze(0).to(device)

    with torch.no_grad():
        out = model(x)
        probs = out.cpu().numpy().ravel()
        try:
            probs = softmax(probs)
        except Exception:
            pass

    topk_idx = np.argsort(probs)[-args.topk:][::-1]
    for i in topk_idx:
        label = classes[i] if i < len(classes) else str(i)
        print(f'{label}: {probs[i]*100:.2f}%')


if __name__ == '__main__':
    main()

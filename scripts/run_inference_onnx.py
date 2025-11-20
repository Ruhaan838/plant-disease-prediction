"""Run inference using an ONNX model (no web server required).

Usage:
  python scripts/run_inference_onnx.py --model models/model.onnx --image path/to/img.jpg --topk 5
"""
import argparse
from pathlib import Path
import json
import numpy as np
import onnxruntime as ort
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from src.model.utils import preprocess_image_pil
from PIL import Image


def softmax(x: np.ndarray):
    x = x - np.max(x)
    exp = np.exp(x)
    return exp / np.sum(exp)


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument('--model', type=Path, default=Path('models/model.onnx'))
    p.add_argument('--image', type=Path, required=True)
    p.add_argument('--topk', type=int, default=5)
    p.add_argument('--img-size', type=int, default=224)
    return p.parse_args()


def main():
    args = parse_args()
    if not args.model.exists():
        raise FileNotFoundError(args.model)
    if not args.image.exists():
        raise FileNotFoundError(args.image)

    labels_path = args.model.parent / 'classes.json'
    labels = None
    if labels_path.exists():
        with open(labels_path, 'r') as f:
            labels = json.load(f)

    sess = ort.InferenceSession(str(args.model))
    img = Image.open(str(args.image)).convert('RGB')
    x = preprocess_image_pil(img, size=(args.img_size, args.img_size))
    x = np.expand_dims(x, axis=0).astype(np.float32)
    input_name = sess.get_inputs()[0].name
    out = sess.run(None, {input_name: x})[0]
    probs = out[0]
    try:
        probs = softmax(probs)
    except Exception:
        pass

    topk_idx = np.argsort(probs)[-args.topk:][::-1]
    for i in topk_idx:
        label = labels[i] if labels and i < len(labels) else str(i)
        print(f'{label}: {probs[i]*100:.2f}%')


if __name__ == '__main__':
    main()

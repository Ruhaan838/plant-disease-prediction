"""FastAPI app (inference) — loads ONNX model and serves /predict endpoint.

This is a minimal skeleton that expects an ONNX model at `models/model.onnx`.
"""
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
from PIL import Image
import onnxruntime as ort
import io
from pathlib import Path
from src.model.utils import preprocess_image_pil
import torch
import json
import subprocess

app = FastAPI(title='Plant Disease Predictor')

# Allow CORS for local development (adjust in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*'],
)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
MODEL_PATH = PROJECT_ROOT / 'models' / 'model.onnx'
WEB_DIR = PROJECT_ROOT / 'src' / 'web'
CHECKPOINT_PATH = PROJECT_ROOT / 'checkpoints' / 'best.pth'

if WEB_DIR.exists():
    # serve JS/CSS under /static to avoid catching API routes
    app.mount('/static', StaticFiles(directory=str(WEB_DIR)), name='static')


@app.get('/')
def root():
    index = WEB_DIR / 'index.html'
    if index.exists():
        from fastapi.responses import FileResponse
        return FileResponse(str(index))
    return JSONResponse({'error': 'frontend not found'}, status_code=404)


@app.on_event('startup')
def load_model():
    global SESSION
    SESSION = None
    try:
        if MODEL_PATH.exists():
            SESSION = ort.InferenceSession(str(MODEL_PATH))
            print('Loaded ONNX model from', MODEL_PATH)
            # verify output dimension matches classes, attempt to fix if not
            try:
                classes = load_labels_from_checkpoint()
                if classes is not None:
                    out_shape = SESSION.get_outputs()[0].shape
                    # try to find numeric class dimension in output shape
                    class_dim = None
                    if isinstance(out_shape, (list, tuple)) and len(out_shape) >= 2:
                        dim = out_shape[1]
                        if isinstance(dim, int):
                            class_dim = dim
                    if class_dim is not None and len(classes) != class_dim:
                        print(f"ONNX output dim ({class_dim}) != num classes ({len(classes)}). Rebuilding ONNX...")
                        try:
                            model_name = infer_model_name_from_checkpoint()
                            subprocess.run([
                                'python', str(PROJECT_ROOT / 'scripts' / 'rebuild_and_export.py'),
                                '--checkpoint', str(CHECKPOINT_PATH),
                                '--output', str(MODEL_PATH),
                                '--model', model_name,
                            ], check=True)
                            # reload session
                            SESSION = ort.InferenceSession(str(MODEL_PATH))
                            print('Rebuilt and reloaded ONNX model')
                        except Exception as e:
                            print('Failed to rebuild ONNX model:', e)
            except Exception:
                pass
        else:
            print('Model file not found at', MODEL_PATH)
    except Exception as e:
        SESSION = None
        print('ONNX model not loaded:', e)


def infer_model_name_from_checkpoint():
    """Try to infer model architecture from checkpoint classifier weight shapes.

    Returns one of: 'resnet50', 'resnet18', 'efficientnet_b0' (best-effort).
    """
    try:
        if not CHECKPOINT_PATH.exists():
            return 'resnet18'
        ckpt = torch.load(str(CHECKPOINT_PATH), map_location='cpu')
        state = ckpt.get('model_state', ckpt)
        # look for common classifier weight keys
        for key in state.keys():
            if key.endswith('fc.weight'):
                in_feat = state[key].shape[1]
                if in_feat == 2048:
                    return 'resnet50'
                if in_feat == 512:
                    return 'resnet18'
            if 'classifier' in key and state[key].ndim == 2:
                in_feat = state[key].shape[1]
                # efficientnet_b0 has 1280 in_features typically
                if in_feat in (1280, 1536):
                    return 'efficientnet_b0'
        # fallback
        return 'resnet18'
    except Exception:
        return 'resnet18'


def load_labels_from_checkpoint():
    if CHECKPOINT_PATH.exists():
        try:
            ckpt = torch.load(str(CHECKPOINT_PATH), map_location='cpu')
            classes = ckpt.get('classes', None)
            if classes is not None:
                return classes
        except Exception as e:
            print('Failed to load checkpoint for labels:', e)
    # fallback: try models/classes.json
    classes_json = PROJECT_ROOT / 'models' / 'classes.json'
    if classes_json.exists():
        try:
            with open(classes_json, 'r') as f:
                return json.load(f)
        except Exception as e:
            print('Failed to read models/classes.json:', e)
    return None


def prettify_label(raw: str) -> str:
    """Turn a raw dataset label like 'Apple___Apple_scab' into 'Apple - Apple Scab'.

    Rules:
    - split on '___' or '__' to separate crop and disease
    - replace remaining underscores with spaces
    - collapse multiple spaces and strip
    - title-case words for readability
    """
    try:
        if '___' in raw:
            left, right = raw.split('___', 1)
        elif '__' in raw:
            left, right = raw.split('__', 1)
        else:
            # fallback: split on first underscore
            parts = raw.split('_', 1)
            if len(parts) == 2:
                left, right = parts[0], parts[1]
            else:
                left, right = raw, ''

        def clean(s: str) -> str:
            s = s.replace('_', ' ')
            # collapse multiple spaces
            s = ' '.join(s.split())
            # title case but keep existing punctuation spacing
            return ' '.join([w.capitalize() for w in s.split(' ')])

        left_c = clean(left)
        right_c = clean(right) if right else ''
        if right_c:
            return f"{left_c} - {right_c}"
        return left_c
    except Exception:
        return raw


@app.post('/predict')
async def predict(file: UploadFile = File(...)):
    if SESSION is None:
        return JSONResponse({'error': 'model not loaded (export ONNX using scripts/export_onnx.py)'}, status_code=503)
    contents = await file.read()
    img = Image.open(io.BytesIO(contents))
    x = preprocess_image_pil(img)
    # add batch dimension
    x = np.expand_dims(x, axis=0).astype(np.float32)
    input_name = SESSION.get_inputs()[0].name
    preds = SESSION.run(None, {input_name: x})[0]
    # preds is (B, C) logits; convert to probabilities with softmax
    try:
        logits = preds.astype('float64')
        # stable softmax
        logits = logits - np.max(logits, axis=1, keepdims=True)
        exp = np.exp(logits)
        probs_np = exp / np.sum(exp, axis=1, keepdims=True)
        probs = probs_np[0].tolist()
    except Exception:
        # fallback: try to coerce to list
        probs = preds[0].tolist()

    # prepare top-k structured output if labels are available
    classes = load_labels_from_checkpoint()
    ranked = []
    # topk default 1 if client didn't ask; we return full probs too
    # compute top indices
    topk_idx = list(reversed(np.argsort(probs).tolist()))
    for i in topk_idx:
        prob = float(probs[i])
        raw = classes[i] if classes and i < len(classes) else str(i)
        ranked.append({'id': int(i), 'raw': raw, 'label': prettify_label(raw) if classes else raw, 'prob': prob})

    # also include a lightweight top-1 summary
    top = ranked[0] if ranked else None
    return {'top': top, 'topk': ranked, 'probs': probs}


@app.get('/labels')
def labels():
    """Return class labels from checkpoint if available."""
    classes = load_labels_from_checkpoint()
    if classes is None:
        return JSONResponse({'error': 'labels not found; ensure checkpoint exists at checkpoints/best.pth or export ONNX'}, status_code=404)
    # return enhanced objects with prettified labels for frontend consumption
    out = []
    for i, raw in enumerate(classes):
        out.append({'id': i, 'raw': raw, 'label': prettify_label(raw)})
    return {'classes': out}


@app.post('/labels/regenerate')
def regenerate_labels_from_data(data_root: str = None):
    """Regenerate `models/classes.json` by reading the dataset folder structure.

    POST body or query param `data_root` may specify path to ImageFolder root.
    If omitted, defaults to `data/plant-disease-classification-dataset`.
    This helps if labels were saved incorrectly (for example the entire archive
    became a single-folder named `dataset`).
    """
    root = PROJECT_ROOT / 'data' / 'plant-disease-classification-dataset' if not data_root else Path(data_root)
    if not root.exists():
        return JSONResponse({'error': f'data root not found: {root}'}, status_code=404)
    # find class subfolders (top-level directories)
    classes = [p.name for p in sorted(root.iterdir()) if p.is_dir()]
    if not classes:
        # try deeper: look for folders that contain many image files
        candidates = [p for p in root.rglob('*') if p.is_dir()]
        best = None
        best_count = 0
        for p in candidates:
            cnt = sum(1 for _ in p.rglob('*') if is_image_file(str(_)))
            if cnt > best_count:
                best = p
                best_count = cnt
        if best is not None:
            classes = [p.name for p in sorted(best.iterdir()) if p.is_dir()]

    if not classes:
        return JSONResponse({'error': 'could not find class folders under data root'}, status_code=400)

    # write models/classes.json
    try:
        models_dir = PROJECT_ROOT / 'models'
        models_dir.mkdir(parents=True, exist_ok=True)
        classes_path = models_dir / 'classes.json'
        import json as _json
        with open(classes_path, 'w') as f:
            _json.dump(classes, f)
        return {'classes': classes, 'written_to': str(classes_path)}
    except Exception as e:
        return JSONResponse({'error': str(e)}, status_code=500)

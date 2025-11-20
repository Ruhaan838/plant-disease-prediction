# Plant Disease Prediction

This repository contains code to train an image classifier for plant disease detection, export the model to ONNX, and serve predictions through a FastAPI backend with a simple web frontend.

Next steps:

See `requirements.txt` for Python dependencies.
# Plant Disease Prediction

This repository contains code to train an image classifier for plant disease detection, export the model to ONNX, and serve predictions through a FastAPI backend with a small web frontend.

Quick start
1. Create and activate a Python environment (conda or venv) and install dependencies:

```bash
# conda (recommended)
conda create -n plantenv python=3.12 -y
conda activate plantenv
pip install -r requirements.txt

# OR using venv
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2. Prepare dataset

Place your dataset under `data/` using an ImageFolder layout:

```
data/<your-dataset>/train/<class_name>/*.jpg
```

This project expects the Kaggle PlantVillage-style layout (e.g. `data/plant-disease-classification-dataset/dataset/train/...`). If your dataset root includes an extra parent folder (for example `dataset`), use the `labels/regenerate` endpoint or the `scripts/rebuild_and_export.py` helper to fix labels.

Training

Run the training script. Example:

```bash
python src/train/train.py \
	--data-dir data/plant-disease-classification-dataset/dataset/train \
	--model resnet50 \
	--epochs 10 \
	--batch-size 32 \
	--img-size 224 \
	--output checkpoints \
	--pretrained
```

Notes:
- Use `--device cuda` or `--device mps` to force device. Default is `auto` (CUDA -> MPS -> CPU).
- Checkpoints are saved to `checkpoints/best.pth` and include `classes` metadata.

Export to ONNX

After training, export the best checkpoint to ONNX:

```bash
python scripts/export_onnx.py --checkpoint checkpoints/best.pth --output models/model.onnx --model resnet50
```

If the checkpoint/class metadata or model architecture don't match the saved ONNX, use the rebuild helper which infers `num_classes` from `models/classes.json` (or the checkpoint) and rebuilds a compatible ONNX model:

```bash
python scripts/rebuild_and_export.py --checkpoint checkpoints/best.pth --output models/model.onnx --model resnet50
```

Run the website (FastAPI)

Start the API + frontend locally with uvicorn:

```bash
uvicorn src.api.app:app --reload --port 8000
```

Open your browser at http://localhost:8000/ to upload images and see predictions.

CLI inference

ONNX runtime (fast):

```bash
python scripts/run_inference_onnx.py --model models/model.onnx --image path/to/image.jpg --topk 5
```

PyTorch inference (uses checkpoint):

```bash
python scripts/run_inference_pytorch.py --checkpoint checkpoints/best.pth --image path/to/image.jpg --topk 5
```

Label fixes & utilities

- Regenerate labels (from dataset folders) and write `models/classes.json`:

	```bash
	# from Python (curl) or via the server
	curl -X POST "http://localhost:8000/labels/regenerate?data_root=data/plant-disease-classification-dataset/dataset/train"
	```

- Rebuild ONNX when classifier shapes mismatch (uses `rebuild_and_export.py`):

	```bash
	python scripts/rebuild_and_export.py --checkpoint checkpoints/best.pth --output models/model.onnx --model resnet50
	```

Troubleshooting

- If the frontend shows labels like `Apple___Apple_scab`, the API now returns prettified labels. Reload the browser to pick up the new `app.js`.
- If predictions always show a single class at 100%, the ONNX output dimension likely doesn't match the number of classes — run `scripts/rebuild_and_export.py` as shown above.
- If you see import errors when running scripts directly, ensure the project root is on `PYTHONPATH` or run scripts from the repository root (they insert project root automatically for common entrypoints).

Files of interest
- `src/train/train.py` — training CLI
- `src/train/data_utils.py` — dataloaders and dataset helpers
- `src/model/models.py` — model definitions
- `scripts/export_onnx.py` — export checkpoint -> ONNX
- `scripts/rebuild_and_export.py` — rebuild/export ONNX with correct `num_classes`
- `src/api/app.py` — FastAPI server (serves frontend + `/predict`)
- `src/web/*` — static frontend (HTML + JS)

License & Notes

This repository is a starting point and demo pipeline. For production use, harden the API, add authentication, validate uploads, and containerize.

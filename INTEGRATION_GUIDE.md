# Plant Disease Prediction - Integration Guide

This guide explains how to run the integrated plant disease prediction system with the Next.js UI connected to the FastAPI backend using your trained ONNX model.

## Architecture

- **Frontend**: Next.js 16 with React 19, TypeScript, and Tailwind CSS
- **Backend**: FastAPI serving predictions using ONNX Runtime
- **Model**: ONNX model exported from PyTorch (located in `models/model.onnx`)
- **Classes**: 41 plant disease classes defined in `models/classes.json`

## Prerequisites

1. **Python Environment** (for FastAPI backend)
   - Python 3.8+
   - Conda environment (NST_env) activated
   - Install dependencies: `pip install -r requirements.txt`

2. **Node.js Environment** (for Next.js frontend)
   - Node.js 18+ 
   - pnpm package manager
   - Install dependencies: `pnpm install`

3. **Model Files**
   - `models/model.onnx` - Exported ONNX model
   - `models/classes.json` - Class labels (41 disease classes)
   - These should already exist in your project

## Running the Application

### Step 1: Start the FastAPI Backend

In your terminal with the conda environment activated:

```bash
cd /Users/ruhaan/Documents/plant_prediction
conda activate NST_env
python -m uvicorn src.api.app:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at: `http://localhost:8000`

You can verify it's running by visiting:
- `http://localhost:8000/docs` - Interactive API documentation
- `http://localhost:8000/labels` - View all disease classes

### Step 2: Start the Next.js Frontend

In a new terminal window:

```bash
cd /Users/ruhaan/Documents/plant_prediction
pnpm dev
```

The UI will be available at: `http://localhost:3000`

## Using the Application

1. **Login/Register**: The app starts with authentication (currently using mock data)
   - Email: Any valid email format
   - Password: Any password

2. **Upload Page**: Upload plant leaf images
   - Click or drag & drop to upload an image
   - Supported formats: JPG, PNG
   - Click "Analyze Image" to get predictions

3. **View Results**:
   - Primary prediction with confidence percentage
   - Plant type identification
   - Treatment recommendations
   - Alternative predictions (top 3 results)
   - Analysis timestamp

4. **History**: View past predictions (currently using mock data)

## API Endpoints

### POST `/predict`
Upload an image for disease prediction.

**Request**: 
- Content-Type: multipart/form-data
- Body: file (image file)

**Response**:
```json
{
  "top": {
    "id": 0,
    "raw": "Apple___Apple_scab",
    "label": "Apple - Apple Scab",
    "prob": 0.95
  },
  "topk": [
    {"id": 0, "raw": "Apple___Apple_scab", "label": "Apple - Apple Scab", "prob": 0.95},
    {"id": 1, "raw": "Apple___Black_rot", "label": "Apple - Black Rot", "prob": 0.03}
  ],
  "probs": [0.95, 0.03, ...]
}
```

### GET `/labels`
Get all supported disease classes.

**Response**:
```json
{
  "classes": [
    {"id": 0, "raw": "Apple___Apple_scab", "label": "Apple - Apple Scab"},
    ...
  ]
}
```

## Configuration

### Environment Variables

The frontend uses `.env.local` to configure the API URL:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Change this if your FastAPI server runs on a different host/port.

## Model Information

Your model supports **41 disease classes** including:
- Apple diseases: Apple Scab, Black Rot, Cedar Apple Rust, Healthy
- Cherry diseases: Powdery Mildew, Healthy
- Chili diseases: Healthy, Leaf Curl, Leaf Spot, Whitefly, Yellowish
- Coffee diseases: Rust, Healthy, Red Spider Mite
- Corn diseases: Cercospora Leaf Spot, Common Rust, Northern Leaf Blight, Healthy
- Grape diseases: Black Rot, Esca, Leaf Blight, Healthy
- Peach, Pepper, Potato, Strawberry, and Tomato diseases

## Troubleshooting

### "Failed to connect to prediction service"
- Ensure FastAPI backend is running on port 8000
- Check that `models/model.onnx` exists
- Verify ONNX Runtime is installed: `pip install onnxruntime`

### "Model not loaded"
- Make sure `models/model.onnx` exists
- Re-export the model: `python scripts/export_onnx.py`
- Check FastAPI logs for errors

### Frontend build errors
- Run `pnpm install` to ensure all dependencies are installed
- Clear `.next` folder and rebuild: `rm -rf .next && pnpm dev`

### CORS errors
- The FastAPI app has CORS enabled for all origins in development
- For production, update the `allow_origins` in `src/api/app.py`

## Production Deployment

### Backend
1. Use a production ASGI server (gunicorn + uvicorn workers)
2. Configure proper CORS origins
3. Add authentication/rate limiting
4. Use environment variables for configuration

### Frontend
1. Build the production bundle: `pnpm build`
2. Start production server: `pnpm start`
3. Or deploy to Vercel/Netlify
4. Update `NEXT_PUBLIC_API_URL` to your production API URL

## Features

✅ Real-time plant disease prediction using ONNX model  
✅ Support for 41 disease classes across multiple crops  
✅ Confidence scores and alternative predictions  
✅ Treatment recommendations for each disease  
✅ Modern, responsive UI with dark mode support  
✅ Image preview and upload history  
✅ Save predictions to history  

## Tech Stack

**Frontend:**
- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui components
- Zustand (state management)

**Backend:**
- FastAPI
- ONNX Runtime
- Pillow (image processing)
- NumPy

**Model:**
- PyTorch training
- ONNX export for efficient inference
- 41-class plant disease classifier

## Next Steps

1. **Authentication**: Replace mock auth with real authentication (Prisma + PostgreSQL)
2. **Database**: Store user history in a real database
3. **Image Storage**: Store uploaded images (AWS S3, Cloudinary)
4. **Model Updates**: Add model versioning and A/B testing
5. **Analytics**: Track prediction accuracy and user feedback

---

For issues or questions, check the logs in both terminals (FastAPI and Next.js).

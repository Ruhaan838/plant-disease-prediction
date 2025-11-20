#!/bin/bash

# Install backend dependencies for Plant Disease Prediction

echo "📦 Installing backend dependencies..."
echo ""

echo "Using conda base environment"
echo ""

echo "Installing Python packages..."
pip install -q fastapi uvicorn python-multipart aiofiles

echo ""
echo "✅ Backend dependencies installed successfully!"
echo ""
echo "To start the backend server, run:"
echo "  python -m uvicorn src.api.app:app --reload --host 0.0.0.0 --port 8000"

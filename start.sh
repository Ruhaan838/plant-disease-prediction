#!/bin/bash

# Quick start script for Plant Disease Prediction app
# This script starts both the FastAPI backend and Next.js frontend

echo "🌱 Starting Plant Disease Prediction System..."
echo ""
echo "Using conda base environment"
echo ""

# Check if model file exists
if [ ! -f "models/model.onnx" ]; then
    echo "⚠️  Warning: models/model.onnx not found"
    echo "Please export your model first: python scripts/export_onnx.py"
    echo ""
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
    echo ""
fi

# Function to cleanup background processes on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

trap cleanup INT TERM

# Start FastAPI backend
echo "🚀 Starting FastAPI backend on http://localhost:8000..."
python -m uvicorn src.api.app:app --reload --host 0.0.0.0 --port 8000 > backend.log 2>&1 &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Check if backend started successfully
if ! ps -p $BACKEND_PID > /dev/null; then
    echo "❌ Failed to start FastAPI backend. Check backend.log for errors."
    exit 1
fi

echo "✅ Backend started (PID: $BACKEND_PID)"
echo "   API Docs: http://localhost:8000/docs"
echo ""

# Start Next.js frontend
echo "🚀 Starting Next.js frontend on http://localhost:3000..."
npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 3

# Check if frontend started successfully
if ! ps -p $FRONTEND_PID > /dev/null; then
    echo "❌ Failed to start Next.js frontend. Check frontend.log for errors."
    kill $BACKEND_PID
    exit 1
fi

echo "✅ Frontend started (PID: $FRONTEND_PID)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Plant Disease Prediction System is running!"
echo ""
echo "📱 Frontend:  http://localhost:3000"
echo "🔧 Backend:   http://localhost:8000"
echo "📚 API Docs:  http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Tail logs
tail -f backend.log frontend.log &

# Wait for either process to exit
wait $BACKEND_PID $FRONTEND_PID

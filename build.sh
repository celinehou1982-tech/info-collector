#!/bin/bash
set -e

echo "Building info-collector frontend..."

# 检查frontend目录是否存在
if [ ! -d "frontend" ]; then
    echo "ERROR: frontend directory not found in $(pwd)"
    echo "Available directories:"
    ls -d */
    exit 1
fi

# 进入frontend目录并构建
cd frontend
echo "Installing dependencies..."
npm install

echo "Running build..."
npm run build

echo "Build completed successfully!"

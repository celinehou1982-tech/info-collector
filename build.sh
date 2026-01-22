#!/bin/bash
set -e

echo "=== Starting build process ==="

# 检查目录结构
echo "Current directory: $(pwd)"
echo "Directory contents:"
ls -la

# 进入frontend目录
if [ -d "frontend" ]; then
    echo "=== Building frontend ==="
    cd frontend

    # 安装依赖
    echo "Installing frontend dependencies..."
    npm ci || npm install

    # 构建
    echo "Building frontend..."
    npm run build

    echo "=== Build completed successfully ==="
    echo "Build output directory:"
    ls -la dist
else
    echo "ERROR: frontend directory not found!"
    exit 1
fi

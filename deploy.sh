#!/bin/bash
set -e

REGISTRY="ghcr.io"
USERNAME="rajaguru2004"
IMAGE_NAME="asset-management-backend"
TAG="latest"
FULL_IMAGE_NAME="$REGISTRY/$USERNAME/$IMAGE_NAME:$TAG"

echo "=========================================="
echo "🚀 Starting deployment for $IMAGE_NAME"
echo "=========================================="

# Check if docker is logged in to ghcr.io
if ! docker system info 2>/dev/null | grep -q "ghcr.io" && [ -z "$GITHUB_ACTIONS" ]; then
  echo "⚠️  Note: Make sure you are logged in to ghcr.io before pushing."
  echo "   Command: echo \$CR_PAT | docker login ghcr.io -u $USERNAME --password-stdin"
fi

# Navigate to backend and build the image
echo "📦 Building Docker image: $FULL_IMAGE_NAME..."
docker build -t "$FULL_IMAGE_NAME" -f apps/backend/Dockerfile apps/backend

# Push the image to GHCR
echo "📤 Pushing image to GHCR..."
docker push "$FULL_IMAGE_NAME"

echo "✅ Successfully deployed $FULL_IMAGE_NAME!"

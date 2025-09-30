#!/bin/bash
# Quick start script for Terraform Log Viewer
# This script helps you run the application using Docker Compose

set -e

echo "============================================"
echo "Terraform Log Viewer - Quick Start"
echo "============================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is available
if ! docker compose version &> /dev/null; then
    echo "Error: Docker Compose is not available."
    echo "Please install Docker Compose or update Docker to a version that includes it."
    exit 1
fi

echo "✓ Docker is installed"
echo "✓ Docker Compose is available"
echo ""

# Start the application
echo "Starting Terraform Log Viewer..."
echo ""

docker compose up -d

echo ""
echo "============================================"
echo "Application started successfully!"
echo "============================================"
echo ""
echo "Access the application at:"
echo "  Frontend: http://localhost:3000"
echo "  Backend API: http://localhost:8000"
echo "  API Docs: http://localhost:8000/docs"
echo ""
echo "To view logs:"
echo "  docker compose logs -f"
echo ""
echo "To stop the application:"
echo "  docker compose down"
echo ""
echo "To stop and remove all data:"
echo "  docker compose down -v"
echo ""

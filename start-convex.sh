#!/bin/bash
# Ensure we're running in the WSL environment
cd "$(dirname "$0")"
echo "Starting Convex development server with TypeScript checking disabled..."
npx convex dev --typecheck=disable

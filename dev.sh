#!/bin/bash
# Start development server with TypeScript checking disabled
npx convex dev --typecheck=disable &
npx next dev

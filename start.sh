#!/bin/bash

echo "Cleaning old processes..."

# Kill common ports used by this project
fuser -k 3001/tcp 2>/dev/null
fuser -k 5173/tcp 2>/dev/null

# Optional: also kill old Vite/Node processes
pkill -f "vite" 2>/dev/null
pkill -f "node server.js" 2>/dev/null

sleep 2

echo "Installing dependencies..."
npm install

echo "Starting backend..."
node server.js &

sleep 2

echo "Starting frontend..."
npm run dev
#!/bin/sh
echo "Running database migrations..."
npx prisma db push
echo "Running seed..."
npx tsx prisma/seed.ts || echo "Seed failed, continuing..."
echo "Starting application..."
node server.js

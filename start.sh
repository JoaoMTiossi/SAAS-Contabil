#!/bin/sh
echo "Running database migrations..."
npx prisma db push --skip-generate
echo "Running seed..."
npx tsx prisma/seed.ts || echo "Seed already applied or failed, continuing..."
echo "Starting application..."
node server.js

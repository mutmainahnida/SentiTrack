#!/bin/sh
echo "Running database migrations..."
npx prisma migrate deploy
echo "Seeding default data..."
node dist/prisma/seed.js
echo "Starting server..."
exec npm run start:prod
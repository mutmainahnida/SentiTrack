#!/bin/sh
echo "Running database migrations..."
npx prisma migrate deploy
echo "Starting server..."
exec npm run start:prod
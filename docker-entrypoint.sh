#!/bin/sh
set -e

echo "🚀 Running Prisma database migrations..."
npx prisma migrate deploy

if [ "$SEED_DB" = "true" ]; then
  echo "🌱 Seeding initial festival data & accounts..."
  npx ts-node --transpile-only prisma/seed.ts || echo "⚠️ Seeding skipped or already populated."
fi

echo "✨ Starting E_Summit_Backend server..."
if [ -f "dist/src/main.js" ]; then
  exec node dist/src/main.js "$@"
elif [ -f "dist/main.js" ]; then
  exec node dist/main.js "$@"
else
  exec "$@"
fi

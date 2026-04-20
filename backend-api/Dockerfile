# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder

WORKDIR /app

ARG NPM_CONFIG_CACHE=/tmp/npm_cache
ENV NPM_CONFIG_CACHE=$NPM_CONFIG_CACHE

COPY package*.json ./

RUN --mount=type=cache,target=/tmp/npm_cache \
    npm ci --ignore-scripts 2>/dev/null || npm ci

COPY prisma/ ./prisma/
COPY docker-entrypoint.sh ./
RUN npx prisma generate

COPY . .
RUN npm run build

RUN npx tsc prisma/seed.ts \
    --outDir dist/prisma \
    --module commonjs \
    --target es2020 \
    --esModuleInterop \
    --skipLibCheck

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./
COPY --from=builder /app/docker-entrypoint.sh ./

RUN chmod +x docker-entrypoint.sh \
 && chmod +x node_modules/.bin/prisma 2>/dev/null || true

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]

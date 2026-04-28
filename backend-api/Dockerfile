# syntax=docker/dockerfile:1
# Backend API — NestJS + Prisma

# ─────────────────────────────────────────────
# Stage 1: Builder
# ─────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

ARG NPM_CONFIG_CACHE=/tmp/npm_cache
ENV NPM_CONFIG_CACHE=$NPM_CONFIG_CACHE

COPY package*.json ./

RUN --mount=type=cache,target=$NPM_CONFIG_CACHE \
    npm ci --ignore-scripts

COPY . .

# Generate Prisma client + compile TS in one layer
RUN npx prisma generate && \
    npm run build

# ─────────────────────────────────────────────
# Stage 2: Runner
# ─────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy only what's needed
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./

EXPOSE 5000

# Healthcheck handled by compose
CMD ["node", "dist/src/main"]

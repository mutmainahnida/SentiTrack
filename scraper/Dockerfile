# syntax=docker/dockerfile:1
# Scraper — Node.js + Puppeteer + Twitter scraper

# ─────────────────────────────────────────────
# Stage 1: Builder
# ─────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

ARG NPM_CONFIG_CACHE=/tmp/npm_cache
ENV NPM_CONFIG_CACHE=$NPM_CONFIG_CACHE

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

COPY package*.json ./

RUN --mount=type=cache,target=$NPM_CONFIG_CACHE \
    npm ci --ignore-scripts

COPY src/ ./src/

# ─────────────────────────────────────────────
# Stage 2: Runtime
# ─────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Install Chromium + Puppeteer Linux deps in one layer
RUN apk add --no-cache \
        chromium \
        nss \
        freetype \
        harfbuzz \
        ca-certificates \
        ttf-freefont \
        wget \
    && rm -rf /var/cache/apk/*

# Puppeteer config: use system chromium, no sandbox (required in containers)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    PUPPETEER_CHROMIUM_ARGS="--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage --disable-gpu" \
    NODE_ENV=production \
    SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src/
COPY package*.json ./

EXPOSE 5001

# Healthcheck handled by compose
CMD ["node", "src/service.js"]

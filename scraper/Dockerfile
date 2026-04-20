# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps

WORKDIR /app

# Essential packages only - no upgrade, minimal set
RUN apk add --no-cache \
        chromium \
        nss \
        ca-certificates \
        curl \
        wget \
        fontconfig \
        libjpeg-turbo \
        libpng \
        gcompat \
        libc6-compat

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_CHROMIUM_ARGS="--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage --disable-gpu"
ENV SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt

COPY package*.json ./

FROM node:20-alpine AS builder

WORKDIR /app

ARG NPM_CONFIG_CACHE=/tmp/npm_cache
ENV NPM_CONFIG_CACHE=$NPM_CONFIG_CACHE

COPY package*.json ./

RUN --mount=type=cache,target=/tmp/npm_cache \
    npm ci --ignore-scripts 2>/dev/null || npm ci

COPY src/ ./src/

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt

COPY --from=deps /usr/bin/chromium-browser /usr/bin/chromium-browser
COPY --from=deps /etc/ssl/certs /etc/ssl/certs
COPY --from=deps /usr/share/fonts /usr/share/fonts

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_CHROMIUM_ARGS="--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage --disable-gpu"

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src

COPY package*.json ./

EXPOSE 5001

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5001/health || exit 1

CMD ["node", "src/service.js"]

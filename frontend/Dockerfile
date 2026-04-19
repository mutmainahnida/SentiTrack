FROM node:20-alpine AS builder

WORKDIR /app

ARG NPM_CONFIG_CACHE=/tmp/npm_cache
ENV NPM_CONFIG_CACHE=$NPM_CONFIG_CACHE

ARG NEXT_TELEMETRY_DISABLED=1
ENV NEXT_TELEMETRY_DISABLED=1

COPY package*.json ./

RUN --mount=type=cache,target=/tmp/npm_cache \
    npm ci --ignore-scripts 2>/dev/null || npm ci

COPY . .

RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=${FRONTEND_PORT:-3000}

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE ${FRONTEND_PORT:-3000}

HEALTHCHECK CMD wget --quiet --tries=1 --spider http://localhost:${FRONTEND_PORT:-3000}/ || exit 1

CMD ["node", "server.js"]
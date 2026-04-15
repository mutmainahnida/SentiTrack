FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npm run build
RUN npm ci --omit=dev && npm cache clean --force

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh
RUN chmod +x prisma 2>/dev/null || true
RUN chmod +x node_modules/.bin/prisma 2>/dev/null || true
COPY package.json ./

EXPOSE 5000
ENTRYPOINT ["./docker-entrypoint.sh"]

FROM ghcr.io/puppeteer/puppeteer:22

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY . .

EXPOSE 5001
CMD ["node", "src/service.js"]

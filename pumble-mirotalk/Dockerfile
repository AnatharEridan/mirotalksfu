FROM node:22-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json manifest.json app.config.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine

RUN apk add --no-cache tini
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY manifest.json app.config.json app.config.example.json ./
COPY scripts ./scripts

RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PUMBLE_ADDON_PORT=5500
ENV PUMBLE_TOKENS_PATH=/app/data/tokens.json

EXPOSE 5500

VOLUME ["/app/data"]

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "scripts/start-production.js"]

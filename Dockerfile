FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html tsconfig.json ./
COPY public ./public
COPY src ./src
RUN npm run build

FROM node:22-bookworm-slim

RUN npm install -g serve@14.2.4

WORKDIR /app
COPY --from=builder /app/dist ./dist

ENV PORT=3003

EXPOSE 3003

CMD ["sh", "-c", "serve -s dist -l tcp://127.0.0.1:${PORT}"]

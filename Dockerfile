# ---- stage 1: build frontend ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# ---- stage 2: runtime ----
FROM node:20-alpine

WORKDIR /app

# Install server dependencies (resolves from /app/server/node_modules)
COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev

# Copy server source
COPY server/ ./server/

# Copy built frontend from builder stage
COPY --from=builder /app/frontend/dist ./frontend/dist

EXPOSE 3000

CMD ["node", "server/index.js"]

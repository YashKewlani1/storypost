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

# Install all server deps from root package.json into /app/node_modules/
# so `node server/index.js` (run from /app) can resolve them
COPY package*.json ./
RUN npm ci --omit=dev

# Copy server source
COPY server/ ./server/

# Copy built frontend from builder stage
COPY --from=builder /app/frontend/dist ./frontend/dist

EXPOSE 3000

CMD ["node", "server/index.js"]

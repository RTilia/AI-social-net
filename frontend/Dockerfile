# ── Stage 1: Build React app ──────────────────────────────────────────────────
FROM node:20-alpine AS build-stage
WORKDIR /app

# Install deps first (layer cache)
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# ── Stage 2: Serve with Nginx ─────────────────────────────────────────────────
FROM nginx:stable-alpine AS production-stage

# Copy built SPA
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Copy our proper nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

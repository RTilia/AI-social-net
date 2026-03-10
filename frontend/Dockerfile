# Step 1: Build
FROM node:20-alpine as build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Step 2: Production
FROM nginx:stable-alpine as production-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Custom Nginx config to handle SPA routing and proxying
RUN echo "server { \
    listen 80; \
    location / { \
    root /usr/share/nginx/html; \
    index index.html index.htm; \
    try_files \$uri \$uri/ /index.html; \
    } \
    location /ws { \
    proxy_pass http://backend:8000; \
    proxy_http_version 1.1; \
    proxy_set_header Upgrade \$http_upgrade; \
    proxy_set_header Connection \"Upgrade\"; \
    proxy_set_header Host \$host; \
    } \
    location /api { \
    proxy_pass http://backend:8000; \
    } \
    location /static { \
    proxy_pass http://backend:8000; \
    } \
    }" > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

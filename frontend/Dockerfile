FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:1.25-alpine AS runtime

COPY --from=builder /app/dist/inddid-frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# nginx master requires root to bind :80; worker processes drop to 'nginx' user automatically
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm run prisma:generate
RUN npm run build

FROM node:20-alpine AS runtime

# Install system deps + Terraform 1.9.8 (bpg/proxmox provider requires >= 1.3)
RUN apk add --no-cache openssl docker-cli docker-cli-compose curl unzip && \
    TF_VERSION="1.9.8" && \
    ARCH="amd64" && \
    curl -fsSL "https://releases.hashicorp.com/terraform/${TF_VERSION}/terraform_${TF_VERSION}_linux_${ARCH}.zip" \
         -o /tmp/terraform.zip && \
    unzip /tmp/terraform.zip -d /usr/local/bin && \
    rm /tmp/terraform.zip && \
    chmod +x /usr/local/bin/terraform && \
    terraform --version

WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm install --omit=dev
RUN npm run prisma:generate
COPY --from=builder /app/dist ./dist

# Run as non-root user (node user is built into node:alpine)
USER node

EXPOSE 3000
CMD ["node", "dist/index.js"]

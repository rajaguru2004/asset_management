# Stage 1: Build stage
FROM node:20-slim AS builder

# Install OpenSSL (needed by Prisma) and compiler tools for native packages
RUN apt-get update && apt-get install -y openssl python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy lock files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy code and generate Prisma client
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 2: Runner stage
FROM node:20-slim AS runner

# Install OpenSSL
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the entire workspace from builder to retain node_modules and built dist
COPY --from=builder /app ./

EXPOSE 3001

# Run db push and seed on startup before launching the NestJS app
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npm run prisma:seed && node dist/src/main.js"]

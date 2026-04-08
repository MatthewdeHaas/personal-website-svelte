# Stage 1: build
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
# Copy db package.json so we can install its dependencies too
COPY db/package*.json ./db/
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: runtime
FROM node:22-alpine AS runtime
WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/db ./db
COPY --from=builder /app/build ./build

# Use --ignore-scripts to prevent Husky from trying to run
RUN npm pkg delete scripts.prepare && \
    npm ci --omit=dev && \
    cd db && \
    npm install --omit=dev

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "build"]

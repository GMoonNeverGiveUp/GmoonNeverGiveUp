# Use Node 18
FROM node:18-alpine AS builder
WORKDIR /app

# Install dependencies
COPY backend/package.json backend/package-lock.json backend/tsconfig.json ./
RUN npm ci

# Install types for cors
RUN npm install --save-dev @types/cors

# Copy source, Prisma schema, and contract ABIs
COPY backend/prisma ./prisma
COPY backend/src    ./src
COPY artifacts       ./artifacts

# Generate Prisma client and build TypeScript
RUN npx prisma generate
RUN npm run build

# Runtime image
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy production assets
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Expose API port
EXPOSE 4000

# Start the application
CMD ["node", "dist/index.js"]

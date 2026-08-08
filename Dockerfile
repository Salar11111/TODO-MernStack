# ---- Stage 1: Build the React client ----
FROM node:20-alpine AS client-build

WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ---- Stage 2: Production server ----
FROM node:20-alpine

WORKDIR /app

# Run as a non-root user for security
RUN addgroup -S app && adduser -S app -G app

# Install server production dependencies only
COPY Server/package*.json ./Server/
RUN cd Server && npm ci --omit=dev

# Copy server source
COPY --chown=app:app Server/ ./Server/

# Copy built client into server's public directory
COPY --from=client-build /app/client/dist ./Server/public

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

USER app

WORKDIR /app/Server
CMD ["node", "index.js"]

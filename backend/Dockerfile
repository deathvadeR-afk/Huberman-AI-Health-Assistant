# Backend Dockerfile for Huberman Health AI Assistant
# Use the latest LTS version with security patches
FROM node:20-alpine3.19

# Install security updates and required packages
RUN apk update && apk upgrade && \
    apk add --no-cache curl dumb-init && \
    rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Create non-root user first
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Copy package files with correct ownership
COPY --chown=nodejs:nodejs package*.json ./

# Switch to non-root user for npm install
USER nodejs

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code with correct ownership
COPY --chown=nodejs:nodejs src/ ./src/

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "src/realServer.js"]

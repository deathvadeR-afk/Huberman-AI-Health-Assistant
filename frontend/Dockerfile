# Frontend Dockerfile for Huberman Health AI Assistant
# Build stage - use latest LTS with security patches
FROM node:20-alpine3.19 AS builder

# Install security updates
RUN apk update && apk upgrade && \
    apk add --no-cache curl && \
    rm -rf /var/cache/apk/*

# Create non-root user first
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Set working directory and ensure proper ownership
WORKDIR /app
RUN chown -R nodejs:nodejs /app

# Copy package files with correct ownership
COPY --chown=nodejs:nodejs package*.json ./

# Switch to non-root user
USER nodejs

# Install dependencies
RUN npm ci && npm cache clean --force

# Copy TypeScript configuration files first
COPY --chown=nodejs:nodejs tsconfig*.json ./
COPY --chown=nodejs:nodejs vite.config.ts ./
COPY --chown=nodejs:nodejs tailwind.config.js ./
COPY --chown=nodejs:nodejs postcss.config.js ./
COPY --chown=nodejs:nodejs eslint.config.js ./

# Copy source code and other files
COPY --chown=nodejs:nodejs src/ ./src/
COPY --chown=nodejs:nodejs public/ ./public/
COPY --chown=nodejs:nodejs index.html ./

# Build the application
RUN npm run build

# Production stage - use latest nginx with security patches
FROM nginx:1.25-alpine

# Install security updates and required packages
RUN apk update && apk upgrade && \
    apk add --no-cache curl dumb-init && \
    rm -rf /var/cache/apk/*

# Create non-root user for nginx
RUN addgroup -g 1001 -S nginx-user && \
    adduser -S nginx-user -u 1001 -G nginx-user

# Copy built assets from builder stage
COPY --from=builder --chown=nginx-user:nginx-user /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY --chown=nginx-user:nginx-user nginx.conf /etc/nginx/nginx.conf

# Create nginx directories with correct permissions
RUN mkdir -p /var/cache/nginx /var/log/nginx /var/run && \
    chown -R nginx-user:nginx-user /var/cache/nginx /var/log/nginx /var/run /usr/share/nginx/html

# Switch to non-root user
USER nginx-user

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

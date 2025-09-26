FROM node:18-alpine

WORKDIR /app

# Install development tools
RUN apk add --no-cache git curl

# Create app user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Skip package copy since we mount the workspace volume
# Package installation will be handled by the CMD

# Keep running as root for development to avoid permission issues
# USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1

# Development command
CMD ["sh", "-c", "npm install && npm run dev"]
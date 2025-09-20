FROM node:18-alpine

WORKDIR /app

# Install development tools
RUN apk add --no-cache git curl

# Create app user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copy package files first for better caching
COPY package*.json ./
RUN npm ci --only=development

# Change ownership
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1

# Development command
CMD ["sh", "-c", "npm install && npm run dev"]
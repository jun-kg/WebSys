FROM node:18-alpine

WORKDIR /app

# Install development tools and dependencies that don't change often
RUN apk add --no-cache git curl

# Create app user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copy package files first for better caching
COPY package*.json ./
RUN npm ci --only=development

# Install nodemon globally for development
RUN npm install -g nodemon

# Change ownership
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Development command with improved restart behavior
CMD ["sh", "-c", "npm install && npx prisma generate && npm run dev"]
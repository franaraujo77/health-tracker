# Stage 1: Build the React application
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package.json ./

# Generate lock file if it doesn't exist and install dependencies
RUN npm install --frozen-lockfile || npm install

# Copy source code
COPY . .

# Build the production-ready application
RUN npm run build

# Stage 2: Production runtime with Nginx
FROM nginx:alpine

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 80 for the web server
EXPOSE 80

# Add health check to monitor container health
# This checks if nginx is serving the app correctly
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Nginx runs in foreground by default in this image

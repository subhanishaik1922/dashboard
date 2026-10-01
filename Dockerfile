# Production Dockerfile for Career Command Center
FROM node:20-alpine

WORKDIR /app

# Install dependencies first for layer caching
COPY package*.json ./
RUN npm install

# Copy application files
COPY . .

# Set environment defaults
ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_PATH=/app/data.json

# Expose server port
EXPOSE 3000

# Mountable volume for static assets
VOLUME ["/app/public/assets"]

# Run server directly
CMD ["node", "server.js"]

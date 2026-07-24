FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY frontend/package*.json ./
RUN npm ci --silent

# Copy source
COPY frontend/ .

# Build Next.js app
RUN npm run build

EXPOSE 3000

# Start in production mode
CMD ["npm", "start"]

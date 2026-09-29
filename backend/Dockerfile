FROM node:18-alpine

WORKDIR /app

# Install dependencies first for layer caching
COPY package*.json ./
RUN npm install --production

# Copy application source code
COPY . .

EXPOSE 5000

# Run database seed to populate vehicles, zones, fines, then start the server
CMD ["sh", "-c", "node seed/seed.js || true; node server.js"]

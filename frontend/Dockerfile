# File overview: frontend/Dockerfile
# Purpose: local development container for Vite dev server.
FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

CMD ["npm", "run", "dev", "--", "--host"]

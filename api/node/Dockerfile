# File overview: api/node/Dockerfile
# Purpose: container recipe for Node OCR/orchestration API service.
FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 8000

CMD ["npm", "start"]

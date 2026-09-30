FROM node:18-alpine

WORKDIR /app

# Copy package files first to speed up future builds
COPY package*.json ./
RUN npm install

# Copy the rest of your Next.js application code
COPY . .

# Set mandatory environment variables so Next.js can talk to your Windows browser
ENV PORT 5000
ENV HOSTNAME "0.0.0.0"

EXPOSE 5000

CMD ["npm", "run", "dev"]

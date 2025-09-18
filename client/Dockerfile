# Use Node.js image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the project
COPY . .

# Expose React dev server port
EXPOSE 3000

ENV HOST=0.0.0.0

# Start React app in development mode
CMD ["npm", "start"]
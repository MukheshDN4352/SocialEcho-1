# Stage 1: Build stage
FROM node:18-alpine AS build

WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy all source files for build
COPY . .

# Stage 2: Production stage
FROM node:18-alpine

WORKDIR /usr/src/app

# Copy only production modules and app source from build stage
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app ./

# Expose port your app listens on (4000 as per your .env)
EXPOSE 4000

# Run the app in production mode using npm script
CMD ["npm", "run", "production"]

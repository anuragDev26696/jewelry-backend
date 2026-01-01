# Use the official Node image as the base
FROM node:20

# 1. Install required system dependencies.
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install ngrok (add ngrok to Docker container if needed)
RUN curl -s https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz | tar xz -C /usr/local/bin

# Set the working directory inside the container
WORKDIR /usr/src/app

# 2. Install Node dependencies
# Copy package.json and package-lock.json first to utilize Docker's build cache
COPY package*.json ./
RUN npm install

# 3. Copy source code and build
# Copy the rest of the application source code
COPY . .

# Build the NestJS application (compiles TypeScript to JavaScript)
RUN npm run build

# 4. Environment and Command Setup
# Set the port Render uses (Render maps this to its external port)
# We set this high to avoid conflicts with common ports.
ENV PORT 10000
EXPOSE 10000

# Command to start the application in production mode
CMD [ "sh", "-c", "ngrok config add-authtoken ${NGROK_AUTHTOKEN} && (npm run start:prod & ngrok http --url=quietistic-uniterative-heide.ngrok-free.dev 10000)" ]
# This is equivalent to 'npm run start:prod'
# CMD [ "node", "dist/main" ]
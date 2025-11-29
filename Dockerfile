# Use the official Node image as the base
FROM node:20

# 1. Install required system dependencies for Puppeteer/Chromium.
RUN apt-get update && apt-get install -y \
    gconf-service \
    libasound2 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libfontconfig1 \
    libgdk-pixbuf2.0-0 \
    libgtk-3-0 \
    # libjpeg-turbo8 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libxss1 \
    libgbm-dev \
    libu2f-udev \
    libvulkan1 \
    --no-install-recommends \
    # Clean up the package list cache to reduce the final image size
    && rm -rf /var/lib/apt/lists/*

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
# This is equivalent to 'npm run start:prod'
CMD [ "node", "dist/main" ]
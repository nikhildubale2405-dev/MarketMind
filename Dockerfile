# Use Node.js 20 LTS (slim for smaller image size)
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies needed for build)
RUN npm ci

# Copy the rest of the source code
COPY . .

# Build: Vite frontend + esbuild server bundle
RUN npm run build

# Remove devDependencies after build to reduce image size
RUN npm prune --production

# Hugging Face Spaces requires port 7860
ENV PORT=7860
ENV NODE_ENV=production

# Expose the port
EXPOSE 7860

# Start the production server
CMD ["node", "dist/server.cjs"]

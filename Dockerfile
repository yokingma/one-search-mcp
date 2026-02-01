# Use Playwright's official image which includes Chromium and all required dependencies
# This supports the local search provider with agent-browser
FROM mcr.microsoft.com/playwright:v1.58.1-jammy

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies (including dev dependencies needed for build)
# Note: Playwright browsers are already installed in the base image
RUN npm ci

# Copy remaining source code
COPY . .

# Build the project
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --production

# Set environment variables
# Default to local search provider (uses agent-browser with Chromium)
ENV SEARCH_PROVIDER=local
ENV NODE_ENV=production

# Run as non-root user for security
USER pwuser

# Command to run the MCP server
CMD ["node", "dist/index.js"]

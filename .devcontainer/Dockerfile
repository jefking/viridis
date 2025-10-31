FROM node:22-alpine

# Install additional tools for development
RUN apk add --no-cache \
    git \
    curl \
    bash \
    vim \
    nano \
    jq \
    redis \
    ca-certificates

# Install global npm packages for development
RUN npm install -g \
    nodemon \
    npm-check-updates

# Set up working directory
WORKDIR /workspace

# Switch to node user for security
USER node

# Expose the application port
EXPOSE 9099

# Default command (can be overridden)
CMD ["bash"]


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
    ca-certificates \
    shadow \
    sudo

# Install global npm packages for development
RUN npm install -g \
    nodemon \
    npm-check-updates

# Ensure node user exists and has correct permissions
RUN if ! id -u node > /dev/null 2>&1; then \
        addgroup -g 1000 node && \
        adduser -D -u 1000 -G node node; \
    fi

# Allow node user to use sudo without password for chown
RUN echo "node ALL=(ALL) NOPASSWD: /bin/chown" >> /etc/sudoers

# Set up working directory
WORKDIR /workspace

# Give node user ownership
RUN chown -R node:node /workspace

# Copy entrypoint script
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Switch to node user for security
USER node

# Expose the application port
EXPOSE 9099

# Set entrypoint
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

# Default command (can be overridden)
CMD ["sleep", "infinity"]


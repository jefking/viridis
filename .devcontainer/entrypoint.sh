#!/bin/bash
set -e

# Fix permissions on node_modules volume if needed
if [ -d "/workspace/src/node_modules" ]; then
    # Check if we need to fix permissions
    if [ ! -w "/workspace/src/node_modules" ]; then
        echo "Fixing node_modules permissions..."
        sudo chown -R node:node /workspace/src/node_modules
    fi
fi

# Execute the command passed to the container
exec "$@"


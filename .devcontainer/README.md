# Viridis Dev Container

This dev container provides a complete development environment for Viridis with all dependencies pre-configured.

## Features

- **Node.js 22** (Alpine Linux)
- **Redis Stack Server** (with time series support)
- **Development Tools**:
  - `nodemon` for auto-reloading
  - `npm-check-updates` for dependency management
  - `jq` for JSON processing
  - Git, curl, vim, nano, bash
- **VS Code Extensions**:
  - ESLint
  - Prettier
  - Jest Runner
  - Docker support
  - And more...

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- [VS Code](https://code.visualstudio.com/)
- [Dev Containers Extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)

### Opening the Dev Container

1. Open this project in VS Code
2. Press `F1` or `Ctrl+Shift+P` (Cmd+Shift+P on Mac)
3. Select **"Dev Containers: Reopen in Container"**
4. Wait for the container to build and start (first time takes a few minutes)

### Running the Application

Once inside the dev container:

```bash
# Navigate to the src directory
cd src

# Install dependencies (if not already done)
npm install

# Start the application
npm start

# Or use nodemon for auto-reload during development
nodemon index.js
```

The application will be available at:
- **Web UI**: http://localhost:9099/
- **API**: http://localhost:9099/api/color

### Running Tests

```bash
cd src

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Development Workflow

#### Auto-reload with Nodemon

```bash
cd src
nodemon index.js
```

Now any changes to `index.js` will automatically restart the server.

#### Check for Outdated Packages

```bash
cd src
npm outdated

# Or use npm-check-updates
ncu
```

#### Update Packages

```bash
cd src
npm update

# Or update to latest versions
ncu -u
npm install
```

### Accessing Redis

Redis is running in a separate container and is accessible at `redis://redis:6379`.

To connect to Redis CLI:

```bash
# From the app container
redis-cli -h redis

# Test connection
redis-cli -h redis ping
```

### Debugging

The dev container is configured for debugging Node.js applications:

1. Set breakpoints in VS Code
2. Press `F5` or go to Run > Start Debugging
3. Select "Node.js" as the debug configuration

### Ports

- **9099**: Viridis application
- **6379**: Redis server

Both ports are automatically forwarded to your local machine.

## Troubleshooting

### Container won't start

```bash
# Rebuild the container
# In VS Code: F1 > "Dev Containers: Rebuild Container"
```

### Redis connection issues

```bash
# Check if Redis is running
docker ps

# Check Redis logs
docker logs viridis-redis
```

### Node modules issues

```bash
# Clean install
cd src
rm -rf node_modules package-lock.json
npm install
```

## Tips

- The workspace is mounted at `/workspace` in the container
- Node modules are stored in a Docker volume for better performance
- All changes to files are immediately reflected (no need to rebuild)
- Use the integrated terminal in VS Code for all commands


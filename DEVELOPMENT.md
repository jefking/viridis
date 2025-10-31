# Viridis Development Guide

## Quick Start with Dev Container

The easiest way to get started with Viridis development is using the VS Code Dev Container.

### Prerequisites

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop)
2. Install [VS Code](https://code.visualstudio.com/)
3. Install the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)

### Opening in Dev Container

1. Open this project in VS Code
2. When prompted, click **"Reopen in Container"**
   - Or press `F1` and select **"Dev Containers: Reopen in Container"**
3. Wait for the container to build (first time takes 2-5 minutes)
4. Once ready, you'll have a complete development environment!

### What's Included

The dev container includes:
- ✅ Node.js 22 (latest LTS)
- ✅ Redis Stack Server with time series support
- ✅ All npm dependencies pre-installed
- ✅ Development tools (nodemon, npm-check-updates, jq, etc.)
- ✅ VS Code extensions (ESLint, Prettier, Jest, etc.)
- ✅ Debugging configuration
- ✅ Auto-formatting on save

## Development Commands

### Running the Application

```bash
# Navigate to src directory
cd src

# Start the application
npm start

# Start with auto-reload (recommended for development)
npm run dev
```

The application will be available at:
- **Web UI**: http://localhost:9099/
- **API Endpoint**: http://localhost:9099/api/color
- **WebSocket**: ws://localhost:9099/ws/color

### Testing

```bash
cd src

# Run all tests
npm test

# Run tests in watch mode (auto-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Using VS Code Tasks

Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac) and type "Tasks: Run Task" to access:
- **Start Viridis** - Run the app normally
- **Start Viridis (Dev Mode)** - Run with nodemon (auto-reload)
- **Run Tests** - Execute test suite
- **Run Tests (Watch)** - Tests in watch mode
- **Run Tests (Coverage)** - Tests with coverage
- **Check Redis Connection** - Verify Redis is working
- **View Redis Data** - Open Redis CLI

### Debugging

#### Debug the Application

1. Set breakpoints in `src/index.js` by clicking in the gutter
2. Press `F5` or go to **Run > Start Debugging**
3. Select **"Launch Viridis"** or **"Launch Viridis with Nodemon"**
4. The debugger will attach and stop at your breakpoints

#### Debug Tests

1. Open a test file (e.g., `src/index.test.js`)
2. Set breakpoints
3. Press `F5` and select **"Jest Current File"** or **"Jest All Tests"**

## API Testing

### Using curl

```bash
# Get current color
curl http://localhost:9099/api/color

# Set a new color
curl -X PUT http://localhost:9099/api/color \
  -H "Content-Type: application/json" \
  -d '{"color":"#FF5733"}'

# Pretty print with jq
curl -s http://localhost:9099/api/color | jq .
```

### Using the Web Interface

Open http://localhost:9099/ in your browser to use the interactive color picker.

## Redis Management

### Connecting to Redis

```bash
# From within the dev container
redis-cli -h redis

# Test connection
redis-cli -h redis ping
# Should return: PONG
```

### Viewing Time Series Data

```bash
redis-cli -h redis

# View all keys
KEYS *

# Get time series info
TS.INFO viridis:color

# Get recent values
TS.RANGE viridis:color - +

# Get last value
TS.GET viridis:color
```

## Project Structure

```
viridis/
├── .devcontainer/          # Dev container configuration
│   ├── devcontainer.json   # VS Code dev container settings
│   ├── docker-compose.yml  # Docker services for dev
│   ├── Dockerfile          # Dev container image
│   └── README.md           # Dev container docs
├── .vscode/                # VS Code workspace settings
│   ├── launch.json         # Debug configurations
│   ├── settings.json       # Editor settings
│   └── tasks.json          # Task definitions
├── src/                    # Application source code
│   ├── index.js            # Main application file
│   ├── index.htm           # Web interface
│   ├── index.test.js       # Test suite
│   ├── jest.config.js      # Jest configuration
│   └── package.json        # Dependencies
├── math/                   # Math utilities
├── docker-compose.yml      # Production Docker setup
├── Dockerfile              # Production Docker image
└── README.md               # Project documentation
```

## Common Development Tasks

### Adding a New Dependency

```bash
cd src
npm install <package-name>
```

The package will be automatically added to `package.json`.

### Checking for Outdated Packages

```bash
cd src

# Using npm
npm outdated

# Using npm-check-updates (shows latest versions)
ncu
```

### Updating Packages

```bash
cd src

# Update within semver ranges
npm update

# Update to latest versions (use with caution)
ncu -u
npm install
```

### Linting and Formatting

Files are automatically formatted on save using Prettier. To manually format:

```bash
cd src

# Format all files (if you add prettier to package.json)
npx prettier --write "**/*.js"
```

## Troubleshooting

### Port Already in Use

If port 9099 is already in use:

```bash
# Find the process using the port
lsof -i :9099

# Kill the process
kill -9 <PID>
```

### Redis Connection Issues

```bash
# Check if Redis is running
docker ps | grep redis

# Check Redis logs
docker logs <redis-container-id>

# Restart Redis
docker restart <redis-container-id>
```

### Node Modules Issues

```bash
cd src

# Clean install
rm -rf node_modules package-lock.json
npm install
```

### Dev Container Issues

If the dev container won't start:

1. Press `F1` in VS Code
2. Select **"Dev Containers: Rebuild Container"**
3. Wait for rebuild to complete

## Tips and Best Practices

1. **Use `npm run dev`** instead of `npm start` during development for auto-reload
2. **Run tests frequently** with `npm run test:watch` in a separate terminal
3. **Use the debugger** instead of `console.log()` for complex issues
4. **Check test coverage** regularly with `npm run test:coverage`
5. **Keep dependencies updated** but test thoroughly after updates
6. **Use VS Code tasks** for common operations (Ctrl+Shift+P > Tasks: Run Task)

## Next Steps

- Read the main [README.md](README.md) for project overview
- Check [.devcontainer/README.md](.devcontainer/README.md) for dev container details
- Review the test suite in `src/index.test.js` to understand the API
- Explore the web interface at http://localhost:9099/

Happy coding! 🎨


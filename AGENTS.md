# AI Agent Context for Viridis

This document provides comprehensive context about the Viridis project for AI agents working on this codebase.

---

## Project Overview

**Viridis** is a real-time collaborative color application that combines geolocation with color sharing. Users share colors based on their geographic location, and colors are averaged over time and proximity to create collaborative color experiences with real-time synchronization.

### Core Concept
- Users share colors tied to their geographic location
- Colors are averaged over time and proximity
- Real-time updates via WebSockets
- 24-hour color history retention
- Collaborative color experiences

### Project Status
- **Version**: alpha-0.0.1
- **Stage**: Alpha development
- **Test Coverage**: 82%+ (48/50 tests passing)
- **Production Ready**: No (alpha stage)

---

## Technology Stack

### Backend
- **Runtime**: Node.js 22 (LTS) on Alpine Linux
- **Framework**: Express 5.1.0
- **WebSocket**: express-ws 5.0.2
- **Database**: Redis 5.9.0 with Time Series module
- **Time Series**: @node-redis/time-series 1.0.2

### Frontend
- **Framework**: Vue.js (basic implementation)
- **Interface**: HTML color picker with geolocation

### Development
- **Testing**: Jest 30.2.0
- **API Testing**: supertest 7.1.4
- **Dev Tools**: nodemon, npm-check-updates
- **Containerization**: Docker with Docker Compose
- **Dev Environment**: VS Code Dev Containers

### Infrastructure
- **Container**: Docker (Alpine-based)
- **Orchestration**: Docker Compose
- **Redis Image**: redis/redis-stack-server:latest
- **CI/CD**: Configured for testing

---

## Architecture

### Application Structure

```
viridis/
├── src/                    # Main application code
│   ├── index.js            # Express server, API routes, WebSocket, Redis integration
│   ├── index.htm           # Web interface (Vue.js)
│   ├── index.test.js       # Comprehensive test suite (50 tests)
│   ├── jest.config.js      # Jest configuration
│   └── package.json        # Dependencies and scripts
├── math/                   # Geographic math utilities
│   └── package.json        # Math module dependencies
├── .devcontainer/          # Dev container configuration
├── .vscode/                # VS Code settings and debug configs
├── docker-compose.yml      # Production Docker setup
├── Dockerfile              # Production image
└── README.md               # Project documentation
```

### Key Components

#### 1. Express Server (`src/index.js`)
- **Port**: 9099
- **Routes**:
  - `GET /` - Serves HTML interface
  - `GET /api/color` - Returns current color and 24h average
  - `PUT /api/color` - Accepts new color (hex format)
  - `WS /ws/color` - WebSocket endpoint for real-time updates

#### 2. Redis Integration
- **Connection**: redis://redis:6379 (in container) or redis://localhost:6379
- **Time Series Key**: `viridis:color`
- **Retention**: 24 hours (86400000 ms)
- **Operations**:
  - `TS.CREATE` - Initialize time series
  - `TS.ADD` - Add color data point
  - `TS.GET` - Get latest color
  - `TS.RANGE` - Get historical data for averaging

#### 3. Color Format
- **Format**: Hex color codes (e.g., `#FF5733`)
- **Validation**: Must be 7 characters, start with #, followed by 6 hex digits
- **Case**: Accepts both uppercase and lowercase
- **Storage**: Stored as RGB components in Redis time series

#### 4. WebSocket
- **Endpoint**: `/ws/color`
- **Purpose**: Real-time color updates
- **Implementation**: express-ws

---

## API Specification

### GET /api/color

Returns the current color and 24-hour average.

**Response**:
```json
{
  "color": "#FF5733",
  "average": "#A1B2C3"
}
```

**Status Codes**:
- `200` - Success
- `500` - Redis error

### PUT /api/color

Sets a new color value.

**Request**:
```json
{
  "color": "#FF5733"
}
```

**Response**:
```json
{
  "success": true
}
```

**Status Codes**:
- `200` - Success
- `400` - Invalid color format
- `500` - Redis error

**Validation Rules**:
- Must include `color` field
- Must be 7 characters long
- Must start with `#`
- Must contain valid hex digits (0-9, A-F, a-f)

---

## Development Environment

### Dev Container Setup

The project uses VS Code Dev Containers for consistent development environments.

**Features**:
- Node.js 22 pre-installed
- Redis Stack Server with Time Series
- All dependencies pre-installed
- Auto-reload with nodemon
- Integrated debugging
- Format on save (Prettier)
- ESLint integration

**How to Use**:
1. Open in VS Code
2. Click "Reopen in Container" or press F1 → "Dev Containers: Reopen in Container"
3. Wait for setup (2-5 minutes first time)
4. Start developing with `cd src && npm run dev`

**Ports**:
- `9099` - Application
- `6379` - Redis

### npm Scripts

```bash
# In src/ directory
npm start           # Start application
npm run dev         # Start with nodemon (auto-reload)
npm test            # Run test suite
npm run test:watch  # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

### VS Code Integration

**Debug Configurations** (`.vscode/launch.json`):
- Launch Viridis - Standard debugging
- Launch Viridis with Nodemon - Auto-reload debugging
- Jest Current File - Debug single test
- Jest All Tests - Debug all tests

**Tasks** (`.vscode/tasks.json`):
- Start Viridis
- Start Viridis (Dev Mode)
- Run Tests
- Run Tests (Watch)
- Run Tests (Coverage)
- Check Redis Connection
- View Redis Data

---

## Testing

### Test Suite (`src/index.test.js`)

**Coverage**: 50 tests, 48 passing, 2 known failures

**Test Categories**:
1. **Express Routes** (16 tests)
   - GET / HTML page
   - GET /api/color with various scenarios
   - PUT /api/color validation and error handling

2. **Redis Integration** (5 tests)
   - Connection handling
   - Time series operations
   - Data storage and retrieval

3. **WebSocket Functionality** (1 test)
   - Endpoint accessibility

4. **Color Utilities** (9 tests)
   - Hex conversion
   - Validation patterns
   - Average calculations

5. **Error Handling** (5 tests)
   - Malformed JSON
   - Empty requests
   - 404 errors

6. **Configuration** (4 tests)
   - Port configuration
   - Redis URL
   - Color validation

7. **Integration Tests** (3 tests)
   - Complete workflows
   - Multiple updates
   - Mixed requests

8. **Edge Cases** (5 tests)
   - Boundary values
   - Parsing edge cases

9. **Redis Time Series Error Handling** (2 tests - FAILING)
   - Known issue with test mocking
   - Does not affect functionality

**Known Issues**:
- 2 tests fail due to Redis time series error mocking issues
- These are test implementation issues, not application bugs
- Application functionality is not affected

### Running Tests

```bash
cd src

# Run all tests
npm test

# Watch mode (auto-run on changes)
npm run test:watch

# With coverage report
npm run test:coverage
```

**Expected Output**:
- 48 tests passing
- 2 tests failing (Redis Time Series Error Handling)
- Coverage: ~82% statements, ~83% branches, ~73% functions

---

## Code Patterns and Conventions

### Error Handling

The application uses try-catch blocks for error handling:

```javascript
try {
    // Redis operations
} catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error message' });
}
```

### Color Validation

```javascript
const colorRegex = /^#[0-9A-Fa-f]{6}$/;
if (!colorRegex.test(color)) {
    return res.status(400).json({ error: 'Invalid color format' });
}
```

### Redis Time Series Operations

```javascript
// Add color to time series
await client.ts.add('viridis:color', timestamp, value);

// Get latest color
const latest = await client.ts.get('viridis:color');

// Get range for averaging
const range = await client.ts.range('viridis:color', '-', '+');
```

### Async/Await Pattern

The codebase consistently uses async/await for asynchronous operations:

```javascript
app.get('/api/color', async (req, res) => {
    try {
        const result = await client.ts.get('viridis:color');
        res.json({ color: result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

---

## Common Tasks

### Adding a New API Endpoint

1. Add route in `src/index.js`
2. Implement async handler with try-catch
3. Add validation if needed
4. Add tests in `src/index.test.js`
5. Update this documentation

### Modifying Color Storage

1. Update Redis operations in `src/index.js`
2. Update time series schema if needed
3. Update tests to match new behavior
4. Test with `npm test`

### Adding Dependencies

```bash
cd src
npm install <package-name>
```

**Important**: Always use npm install, never manually edit package.json for dependencies.

### Updating Dependencies

```bash
cd src

# Check for updates
npm outdated
# or
ncu

# Update within semver ranges
npm update

# Update to latest (use with caution)
ncu -u
npm install
```

---

## Docker and Deployment

### Production Docker Setup

**Dockerfile**:
- Base: `node:22-alpine`
- Working directory: `/usr/src/app`
- Exposes port: 9099
- Runs as: node user

**docker-compose.yml**:
- Services: viridis (app) and redis
- Network: viridis_default
- Volumes: Redis data persistence

### Building and Running

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down

# Rebuild
docker-compose up -d --build
```

### Environment Variables

- `REDIS_URL` - Redis connection string (default: redis://redis:6379)
- `NODE_ENV` - Environment (development/production)
- `PORT` - Application port (default: 9099)

---

## Troubleshooting

### Common Issues

1. **Port 9099 already in use**
   ```bash
   docker-compose down
   # or
   lsof -i :9099
   kill -9 <PID>
   ```

2. **Redis connection failed**
   ```bash
   # Check Redis is running
   docker ps | grep redis
   
   # Test connection
   redis-cli -h redis ping
   # or
   redis-cli -h localhost ping
   ```

3. **npm install permission errors**
   - In dev container: Fixed by entrypoint script
   - Locally: Use `sudo chown -R $USER:$USER node_modules`

4. **Tests failing**
   - Expected: 2 tests fail (Redis Time Series Error Handling)
   - If more fail: Check Redis connection
   - Run `npm test` to see details

5. **Dev container won't start**
   - Press F1 → "Dev Containers: Rebuild Container"
   - Check Docker is running
   - Check docker-compose version compatibility

---

## Important Notes for AI Agents

### When Making Changes

1. **Always run tests** after changes: `cd src && npm test`
2. **Check test coverage**: Maintain 80%+ coverage
3. **Use package managers**: Never manually edit package.json for dependencies
4. **Follow async/await pattern**: Consistent with existing code
5. **Add error handling**: All async operations need try-catch
6. **Update tests**: Add tests for new functionality
7. **Validate input**: All API endpoints should validate input

### Code Style

- **Indentation**: 4 spaces (configured in .prettierrc)
- **Quotes**: Single quotes for strings
- **Semicolons**: Required
- **Line length**: 100 characters max
- **Formatting**: Prettier handles this automatically

### Testing Requirements

- All new features must have tests
- Maintain 80%+ code coverage
- Tests should be in `src/index.test.js`
- Use Jest and supertest patterns from existing tests
- Mock Redis operations for unit tests

### Redis Best Practices

- Always use time series for temporal data
- Set retention policies (24 hours for colors)
- Handle connection errors gracefully
- Use async/await for all Redis operations
- Close connections properly on shutdown

### Security Considerations

- Input validation on all endpoints
- No SQL injection risk (using Redis)
- Hex color validation prevents injection
- Run as non-root user (node) in containers
- Limited sudo permissions in dev container

---

## Future Enhancements (from README)

The README mentions these planned features:
- Haptics integration
- Algorithms to incentivize transitions
- Enhanced geolocation features
- Improved averaging algorithms

---

## Quick Reference

### File Locations
- Main app: `src/index.js`
- Tests: `src/index.test.js`
- Web UI: `src/index.htm`
- Config: `src/jest.config.js`, `src/package.json`
- Docker: `Dockerfile`, `docker-compose.yml`
- Dev container: `.devcontainer/`

### Key Commands
```bash
# Development
cd src && npm run dev

# Testing
cd src && npm test

# Docker
docker-compose up -d
docker-compose logs -f
docker-compose down

# Dev Container
# F1 → "Dev Containers: Reopen in Container"
```

### Important URLs
- App: http://localhost:9099/
- API: http://localhost:9099/api/color
- WebSocket: ws://localhost:9099/ws/color
- Redis: redis://localhost:6379

---

## Summary

Viridis is a well-structured, tested Node.js application for collaborative color sharing with:
- Modern tech stack (Node 22, Express 5, Redis 5, Jest 30)
- Comprehensive test suite (82% coverage)
- Docker containerization
- Dev container for easy development
- Real-time WebSocket updates
- Time series data storage
- Geographic color averaging

The codebase is clean, well-tested, and ready for development. The dev container provides a complete, isolated environment with all tools pre-configured.


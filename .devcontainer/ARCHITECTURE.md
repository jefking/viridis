# Dev Container Architecture

## Overview

The Viridis dev container provides a complete, isolated development environment with all dependencies pre-configured.

## Container Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        VS Code                               │
│                    (Your Local Machine)                      │
└────────────────────────┬────────────────────────────────────┘
                         │ Dev Container Extension
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   Docker Desktop                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              viridis-dev Network                      │  │
│  │                                                        │  │
│  │  ┌─────────────────────┐    ┌────────────────────┐  │  │
│  │  │   App Container     │    │  Redis Container   │  │  │
│  │  │   (node:22-alpine)  │    │  (redis-stack)     │  │  │
│  │  │                     │    │                    │  │  │
│  │  │  - Node.js 22       │◄───┤  - Port 6379       │  │  │
│  │  │  - npm packages     │    │  - Time Series     │  │  │
│  │  │  - Dev tools        │    │  - Persistent data │  │  │
│  │  │  - Your code        │    │                    │  │  │
│  │  │  - Port 9099        │    │                    │  │  │
│  │  └─────────────────────┘    └────────────────────┘  │  │
│  │           ▲                           ▲              │  │
│  │           │                           │              │  │
│  │      Workspace                   Redis Data         │  │
│  │       Volume                      Volume            │  │
│  └──────────┼───────────────────────────┼──────────────┘  │
│             │                           │                  │
└─────────────┼───────────────────────────┼──────────────────┘
              │                           │
              │                           │
         Your Files                  Persisted
      (Live Sync)                   Redis Data
```

## Components

### 1. App Container

**Base Image**: `node:22-alpine`

**Installed Tools**:
- Node.js 22.x (LTS)
- npm 10.x
- nodemon (auto-reload)
- npm-check-updates (dependency management)
- git, curl, bash, vim, nano, jq
- redis-cli (for debugging)

**Volumes**:
- Workspace: `/workspace` (your project files)
- Node modules: Docker volume (for performance)

**Ports**:
- 9099: Viridis application

**Environment**:
- `REDIS_URL=redis://redis:6379`
- `NODE_ENV=development`

### 2. Redis Container

**Image**: `redis/redis-stack-server:latest`

**Features**:
- Redis 7.x
- RedisTimeSeries module
- RedisJSON module
- RedisBloom module
- RedisSearch module

**Volumes**:
- Data: Docker volume (persists between restarts)

**Ports**:
- 6379: Redis server

**Health Check**:
- Command: `redis-cli ping`
- Interval: 5 seconds

### 3. Network

**Type**: Bridge network (`viridis-dev`)

**Purpose**:
- Allows containers to communicate
- App can reach Redis at `redis:6379`
- Isolated from other Docker networks

## Data Flow

### Development Workflow

```
┌──────────┐
│  Editor  │  You edit files in VS Code
└────┬─────┘
     │
     ▼
┌──────────┐
│  Volume  │  Changes sync to container instantly
└────┬─────┘
     │
     ▼
┌──────────┐
│ Nodemon  │  Detects changes and restarts app
└────┬─────┘
     │
     ▼
┌──────────┐
│   App    │  New code runs immediately
└──────────┘
```

### API Request Flow

```
Browser/curl
     │
     ▼
Port 9099 (forwarded)
     │
     ▼
App Container
     │
     ▼
Express Server
     │
     ▼
Redis Client
     │
     ▼
redis://redis:6379
     │
     ▼
Redis Container
     │
     ▼
Time Series Data
```

## Volume Strategy

### Workspace Volume (Bind Mount)

```
Host: /path/to/viridis
  ↕
Container: /workspace
```

**Type**: Bind mount with `cached` consistency
**Purpose**: Live code editing
**Performance**: Optimized for macOS/Windows

### Node Modules Volume (Named Volume)

```
Docker Volume: node_modules
  ↕
Container: /workspace/src/node_modules
```

**Type**: Named Docker volume
**Purpose**: Fast dependency access
**Benefit**: Avoids cross-platform issues

### Redis Data Volume (Named Volume)

```
Docker Volume: redis-data
  ↕
Container: /data
```

**Type**: Named Docker volume
**Purpose**: Persist Redis data
**Benefit**: Data survives container restarts

## Port Forwarding

VS Code automatically forwards ports from the container to your local machine:

| Container Port | Local Port | Service |
|----------------|------------|---------|
| 9099 | 9099 | Viridis App |
| 6379 | 6379 | Redis |

Access services as if they were running locally:
- http://localhost:9099/
- redis://localhost:6379

## VS Code Integration

### Extensions

Automatically installed in the container:
- ESLint (linting)
- Prettier (formatting)
- Jest (test runner)
- Docker (container management)
- npm IntelliSense (package completion)
- Error Lens (inline errors)

### Settings

Applied automatically:
- Format on save
- Auto-fix ESLint issues
- Jest integration
- Terminal defaults

### Debug Configuration

Pre-configured launch configs:
- Launch Viridis
- Launch with Nodemon
- Debug Jest tests

## Performance Optimizations

1. **Alpine Linux**: Smaller image size (~50MB vs ~900MB)
2. **Named Volumes**: Fast node_modules access
3. **Cached Mounts**: Optimized file sync
4. **Layer Caching**: Faster rebuilds
5. **Health Checks**: Ensures Redis is ready

## Security

1. **Non-root User**: Runs as `node` user (UID 1000)
2. **Isolated Network**: Containers can't access host network
3. **No Privileged Mode**: Standard container permissions
4. **Volume Permissions**: Proper file ownership

## Troubleshooting

### Slow Performance

**macOS/Windows**: This is expected due to file system overhead
**Solution**: Use named volumes for dependencies (already configured)

### Port Conflicts

**Issue**: Port 9099 or 6379 already in use
**Solution**: Stop other containers or change ports in `docker-compose.yml`

### Permission Issues

**Issue**: Can't write files
**Solution**: Check user ID matches (1000:1000)

### Redis Connection Failed

**Issue**: App can't connect to Redis
**Solution**: 
1. Check Redis is running: `docker ps`
2. Check health: `redis-cli -h redis ping`
3. Restart containers: Rebuild dev container

## Maintenance

### Updating Dependencies

```bash
cd src
npm update          # Update within semver
ncu -u && npm i     # Update to latest
```

### Rebuilding Container

```
F1 → "Dev Containers: Rebuild Container"
```

### Cleaning Up

```bash
# Remove volumes (loses data!)
docker volume rm viridis_node_modules viridis_redis-data

# Remove all dev container data
docker-compose -f .devcontainer/docker-compose.yml down -v
```

## Benefits

✅ **Consistent Environment**: Same setup for all developers
✅ **No Local Install**: No need to install Node.js or Redis
✅ **Isolated**: Won't conflict with other projects
✅ **Pre-configured**: All tools and extensions ready
✅ **Fast Setup**: One click to start developing
✅ **Reproducible**: Same environment every time
✅ **Portable**: Works on Windows, macOS, Linux

## Comparison: Dev Container vs Local vs Production

| Feature | Dev Container | Local Dev | Production |
|---------|---------------|-----------|------------|
| Node Version | 22 (Alpine) | Varies | 22 (Alpine) |
| Redis | Stack Server | Manual install | Stack Server |
| Auto-reload | ✅ nodemon | Manual | ❌ |
| Debugging | ✅ Integrated | Manual setup | ❌ |
| Extensions | ✅ Auto-install | Manual | N/A |
| Isolation | ✅ Full | ❌ Shared | ✅ Full |
| Setup Time | 5 min | 30+ min | N/A |
| Consistency | ✅ Perfect | ❌ Varies | ✅ Perfect |

---

For more details, see:
- [devcontainer.json](devcontainer.json) - Configuration
- [docker-compose.yml](docker-compose.yml) - Services
- [Dockerfile](Dockerfile) - Image definition


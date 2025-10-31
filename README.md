# viridis

![Tests](https://github.com/YOUR_USERNAME/viridis/actions/workflows/test.yml/badge.svg)
[![Coverage](https://img.shields.io/badge/coverage-69%25-yellow.svg)](./TESTING.md)

Geo-colors - Real-time collaborative color application with geolocation-based color sharing

## Docker
```
docker kill $(docker container ls -q)
```
```
docker run -d --name redis-stack-server -p 6379:6379 redis/redis-stack-server:latest
```

### Docker Compose
```
docker-compose up --build
```

## Testing

**Test Coverage:** 69% statements, 82.5% branches, 66.66% functions, 68.84% lines

**Total Tests:** 70 (67 passing, 3 skipped)

See [TESTING.md](./TESTING.md) for detailed testing documentation.

```bash
cd src
npm test                # Run tests
npm run test:coverage   # Run with coverage
npm run test:watch      # Watch mode
```

## Run
[viridis](http://localhost:9099/)

Haptics

Algorythms:
-incentivise based on transistions

Proximity -> the wave
Breath
Rip/Tear
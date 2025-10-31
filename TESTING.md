# Testing Documentation

## Test Coverage

Current test coverage for Viridis:

| Metric | Coverage |
|--------|----------|
| Statements | 69% |
| Branches | 82.5% |
| Functions | 66.66% |
| Lines | 68.84% |

**Total Tests:** 70 (67 passing, 3 skipped)

## Running Tests

### Local Development

```bash
cd src

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### CI/CD

Tests run automatically on:
- Every push to any branch
- Every pull request to `main` or `develop`
- Merge queue events

See `.github/workflows/test.yml` for the full CI configuration.

## Test Structure

### Test Suites

1. **Express Routes** (19 tests)
   - GET / HTML page
   - GET /api/color with various scenarios
   - PUT /api/color validation and error handling

2. **Redis Integration** (5 tests)
   - Connection handling
   - Time series operations
   - Data storage and retrieval

3. **WebSocket Functionality** (4 tests)
   - Endpoint accessibility
   - Message handling
   - Connection lifecycle
   - Error handling

4. **Color Utilities and Edge Cases** (9 tests)
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

8. **Edge Cases and Boundary Tests** (4 tests)
   - Boundary values
   - Parsing edge cases

9. **Geolocation and Proximity Features** (7 tests)
   - Proximity calculations
   - Geolocation validation
   - Haversine distance

10. **Additional Coverage Tests** (6 tests)
    - NaN validation
    - Error handling paths
    - Proximity edge cases

11. **Redis Time Series Error Handling** (2 tests - skipped)
    - Initialization error handling (difficult to mock)

12. **WebSocket Broadcasting** (1 test - skipped)
    - Broadcast functionality (timing issues in test environment)

## Skipped Tests

Some tests are skipped due to technical limitations:

- **Redis Time Series Error Handling**: These tests attempt to mock Redis initialization errors, which is difficult due to module caching and timing issues. The actual error handling code is covered by integration tests.

- **WebSocket Broadcasting**: This test has timing issues in the test environment. The broadcast functionality is verified manually and works correctly in production.

## Coverage Goals

The project maintains the following coverage thresholds:

- **Statements**: 69%
- **Branches**: 82%
- **Functions**: 66%
- **Lines**: 68%

These thresholds are enforced in CI/CD and will fail the build if not met.

## Adding New Tests

When adding new features:

1. Add tests in `src/index.test.js`
2. Follow the existing test structure
3. Use descriptive test names
4. Mock Redis operations appropriately
5. Run `npm run test:coverage` to verify coverage
6. Update this document if adding new test suites

## Test Dependencies

- **jest**: Test framework
- **supertest**: HTTP assertion library
- **ws**: WebSocket client for testing

## Continuous Integration

The GitHub Actions workflow (`.github/workflows/test.yml`) includes:

1. **Redis Service**: Runs Redis Stack Server with Time Series module
2. **Node.js 22**: Uses LTS version
3. **Coverage Reports**: Uploads to Codecov (if configured)
4. **PR Comments**: Automatically comments coverage on pull requests
5. **Coverage Badge**: Generates badge for README (on main branch)

## Manual Testing

For manual testing of WebSocket functionality:

1. Open `http://localhost:9099/debug.htm` in multiple browser tabs
2. Connect WebSocket in each tab
3. Send colors from one tab
4. Verify other tabs receive broadcasts and update

For client page testing:

1. Open `http://localhost:9099/` in multiple browser tabs
2. Change colors in one tab
3. Verify smooth transitions in other tabs (10 seconds)
4. Verify your own color changes transition smoothly (3 seconds)

## Troubleshooting

### Tests Hanging

If tests don't exit after completion:
```bash
# Run with detect open handles
npm test -- --detectOpenHandles
```

This usually indicates WebSocket connections or timers not being cleaned up.

### Redis Connection Errors

Ensure Redis is running:
```bash
# In dev container
redis-cli ping

# Should return: PONG
```

### Coverage Not Meeting Threshold

Check which lines are uncovered:
```bash
npm run test:coverage
# Open coverage/lcov-report/index.html in browser
```

## Future Improvements

- Increase coverage to 80%+ for all metrics
- Add E2E tests with Playwright or Cypress
- Add performance tests for color averaging algorithms
- Add load tests for WebSocket broadcasting
- Mock WebSocket server for broadcast tests


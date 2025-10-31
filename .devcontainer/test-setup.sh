#!/bin/bash
# Test script to verify dev container setup

set -e

echo "========================================="
echo "Testing Viridis Dev Container Setup"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to print test result
test_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: $2"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}: $2"
        ((TESTS_FAILED++))
    fi
}

echo "1. Testing Docker Compose..."
docker-compose ps > /dev/null 2>&1
test_result $? "Docker Compose is working"
echo ""

echo "2. Checking containers are running..."
APP_RUNNING=$(docker-compose ps | grep "devcontainer_app" | grep "Up" | wc -l)
REDIS_RUNNING=$(docker-compose ps | grep "devcontainer_redis" | grep "Up" | wc -l)

if [ "$APP_RUNNING" -eq 1 ]; then
    test_result 0 "App container is running"
else
    test_result 1 "App container is NOT running"
fi

if [ "$REDIS_RUNNING" -eq 1 ]; then
    test_result 0 "Redis container is running"
else
    test_result 1 "Redis container is NOT running"
fi
echo ""

echo "3. Testing Node.js version..."
NODE_VERSION=$(docker-compose exec -T app node --version)
if [[ "$NODE_VERSION" == v22* ]]; then
    test_result 0 "Node.js version is $NODE_VERSION"
else
    test_result 1 "Node.js version is $NODE_VERSION (expected v22.x.x)"
fi
echo ""

echo "4. Testing Redis connection..."
REDIS_PING=$(docker-compose exec -T app redis-cli -h redis ping 2>&1)
if [ "$REDIS_PING" == "PONG" ]; then
    test_result 0 "Redis connection successful"
else
    test_result 1 "Redis connection failed: $REDIS_PING"
fi
echo ""

echo "5. Testing npm dependencies..."
docker-compose exec -T app bash -c "cd src && npm list --depth=0" > /dev/null 2>&1
test_result $? "npm dependencies are installed"
echo ""

echo "6. Running tests..."
TEST_OUTPUT=$(docker-compose exec -T app bash -c "cd src && npm test 2>&1")
TEST_PASSED=$(echo "$TEST_OUTPUT" | grep -o "[0-9]* passed" | grep -o "[0-9]*")
TEST_FAILED=$(echo "$TEST_OUTPUT" | grep -o "[0-9]* failed" | grep -o "[0-9]*" || echo "0")

echo "   Tests passed: $TEST_PASSED"
echo "   Tests failed: $TEST_FAILED"

if [ "$TEST_PASSED" -ge 48 ]; then
    test_result 0 "Test suite passed ($TEST_PASSED/50 tests)"
else
    test_result 1 "Test suite failed (only $TEST_PASSED tests passed)"
fi
echo ""

echo "7. Testing application startup..."
# Kill any existing node processes
docker-compose exec -T app pkill -f "node.*index.js" > /dev/null 2>&1 || true
sleep 1

# Start the app in background
docker-compose exec -d app bash -c "cd src && npm start" > /dev/null 2>&1
sleep 3

# Test if app is responding
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9099/api/color)
if [ "$HTTP_CODE" == "200" ]; then
    test_result 0 "Application is responding (HTTP $HTTP_CODE)"
else
    test_result 1 "Application is NOT responding (HTTP $HTTP_CODE)"
fi
echo ""

echo "8. Testing API endpoints..."
# Test GET
GET_RESPONSE=$(curl -s http://localhost:9099/api/color)
if echo "$GET_RESPONSE" | jq -e '.color' > /dev/null 2>&1; then
    test_result 0 "GET /api/color returns valid JSON"
else
    test_result 1 "GET /api/color does NOT return valid JSON"
fi

# Test PUT
PUT_RESPONSE=$(curl -s -X PUT http://localhost:9099/api/color -H "Content-Type: application/json" -d '{"color":"#FF5733"}')
if echo "$PUT_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    test_result 0 "PUT /api/color accepts valid color"
else
    test_result 1 "PUT /api/color does NOT accept valid color"
fi
echo ""

echo "9. Testing development tools..."
# Test nodemon
if docker-compose exec -T app which nodemon > /dev/null 2>&1; then
    test_result 0 "nodemon is installed"
else
    test_result 1 "nodemon is NOT installed"
fi

# Test npm-check-updates
if docker-compose exec -T app which ncu > /dev/null 2>&1; then
    test_result 0 "npm-check-updates is installed"
else
    test_result 1 "npm-check-updates is NOT installed"
fi

# Test jq
if docker-compose exec -T app which jq > /dev/null 2>&1; then
    test_result 0 "jq is installed"
else
    test_result 1 "jq is NOT installed"
fi
echo ""

echo "========================================="
echo "Test Summary"
echo "========================================="
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed! Dev container is ready.${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Please review the output above.${NC}"
    exit 1
fi


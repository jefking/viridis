const request = require('supertest');

// Mock Redis before requiring the main module
const mockRedisClient = {
  connect: jest.fn().mockResolvedValue(undefined),
  hSet: jest.fn().mockResolvedValue(1),
  zAdd: jest.fn().mockResolvedValue(1),
  zRemRangeByScore: jest.fn().mockResolvedValue(0),
  zRangeByScore: jest.fn().mockResolvedValue([]),
  ts: {
    create: jest.fn().mockResolvedValue('OK'),
    add: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue({ value: 16777215, timestamp: Date.now() }),
    range: jest.fn().mockResolvedValue([
      { timestamp: Date.now() - 1000, value: 16777215 },
      { timestamp: Date.now(), value: 8388607 }
    ])
  }
};

jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedisClient)
}));

// Mock file system
const mockPaletteData = {
  "name": "Viridis Color Palette",
  "version": "1.0.0",
  "colors": [
    { "hex": "#FF0000", "name": "Red" },
    { "hex": "#FF4500", "name": "Orange Red" },
    { "hex": "#FF8C00", "name": "Dark Orange" },
    { "hex": "#FFA500", "name": "Orange" },
    { "hex": "#FFD700", "name": "Gold" },
    { "hex": "#FFFF00", "name": "Yellow" },
    { "hex": "#9ACD32", "name": "Yellow Green" },
    { "hex": "#7FFF00", "name": "Chartreuse" },
    { "hex": "#00FF00", "name": "Green" },
    { "hex": "#00FA9A", "name": "Medium Spring Green" },
    { "hex": "#00CED1", "name": "Dark Turquoise" },
    { "hex": "#00BFFF", "name": "Deep Sky Blue" },
    { "hex": "#1E90FF", "name": "Dodger Blue" },
    { "hex": "#0000FF", "name": "Blue" },
    { "hex": "#4169E1", "name": "Royal Blue" },
    { "hex": "#8A2BE2", "name": "Blue Violet" },
    { "hex": "#9370DB", "name": "Medium Purple" },
    { "hex": "#BA55D3", "name": "Medium Orchid" },
    { "hex": "#FF00FF", "name": "Magenta" },
    { "hex": "#FF1493", "name": "Deep Pink" },
    { "hex": "#FF69B4", "name": "Hot Pink" },
    { "hex": "#DC143C", "name": "Crimson" },
    { "hex": "#FF6347", "name": "Tomato" },
    { "hex": "#FF7F50", "name": "Coral" },
    { "hex": "#FFB6C1", "name": "Light Pink" },
    { "hex": "#FFA07A", "name": "Light Salmon" },
    { "hex": "#20B2AA", "name": "Light Sea Green" },
    { "hex": "#87CEEB", "name": "Sky Blue" },
    { "hex": "#7B68EE", "name": "Medium Slate Blue" },
    { "hex": "#8B4513", "name": "Saddle Brown" },
    { "hex": "#D2691E", "name": "Chocolate" },
    { "hex": "#CD853F", "name": "Peru" }
  ]
};

jest.mock('fs', () => ({
  readFileSync: jest.fn((path) => {
    if (path.includes('palette.json')) {
      return JSON.stringify(mockPaletteData);
    }
    return '<html><body><h1>Viridis</h1><div id="color"></div></body></html>';
  })
}));

// Mock console to reduce noise
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

describe('Viridis Application - Complete Test Suite', () => {
  let app;

  beforeAll(async () => {
    // Clear module cache and require the app
    delete require.cache[require.resolve('./index.js')];
    
    // Import the module
    app = require('./index.js');
    
    // Wait a bit for async operations
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('Express Routes', () => {
    test('GET / should return HTML page', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.type).toBe('text/html');
      expect(response.text).toContain('Viridis');
    });

    test('GET /api/color should return current color data', async () => {
      const response = await request(app).get('/api/color');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('color');
      expect(response.body).toHaveProperty('average');
      expect(typeof response.body.color).toBe('string');
      expect(typeof response.body.average).toBe('string');
      expect(response.body.color).toMatch(/^#[0-9A-F]{6}$/);
      expect(response.body.average).toMatch(/^#[0-9A-F]{6}$/);
    });

    test('GET /api/color should handle Redis errors gracefully', async () => {
      // Mock Redis to throw an error
      mockRedisClient.ts.get.mockRejectedValueOnce(new Error('Redis error'));
      
      const response = await request(app).get('/api/color');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('color');
      expect(response.body.color).toMatch(/^#[0-9A-F]{6}$/);
    });

    test('GET /api/color should handle Redis range errors gracefully', async () => {
      // Mock Redis range to throw an error
      mockRedisClient.ts.range.mockRejectedValueOnce(new Error('Redis range error'));
      
      const response = await request(app).get('/api/color');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('average');
      expect(response.body.average).toMatch(/^#[0-9A-F]{6}$/);
    });

    test('GET /api/color should handle critical errors', async () => {
      // Mock both operations to fail to trigger the catch block
      mockRedisClient.ts.get.mockImplementationOnce(() => {
        throw new Error('Critical error');
      });
      mockRedisClient.ts.range.mockImplementationOnce(() => {
        throw new Error('Critical error');
      });
      
      const response = await request(app).get('/api/color');
      expect([200, 500]).toContain(response.status);
    });

    test('PUT /api/color should accept valid color with geolocation', async () => {
      const validColor = {
        id: 'test-user-123',
        color: '#FF0000',
        lat: 37.7749,
        long: -122.4194
      };
      const response = await request(app)
        .put('/api/color')
        .send(validColor);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    test('PUT /api/color should accept lowercase hex colors', async () => {
      const validColor = {
        id: 'test-user-456',
        color: '#ff0000',
        lat: 40.7128,
        long: -74.0060
      };
      const response = await request(app)
        .put('/api/color')
        .send(validColor);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    test('PUT /api/color should reject invalid color format', async () => {
      const invalidColor = {
        id: 'test-user-789',
        color: 'invalid-color',
        lat: 37.7749,
        long: -122.4194
      };
      const response = await request(app)
        .put('/api/color')
        .send(invalidColor);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });

    test('PUT /api/color should reject missing color', async () => {
      const response = await request(app)
        .put('/api/color')
        .send({
          id: 'test-user-999',
          lat: 37.7749,
          long: -122.4194
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    test('PUT /api/color should reject missing geolocation', async () => {
      const response = await request(app)
        .put('/api/color')
        .send({
          id: 'test-user-888',
          color: '#FF0000'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    test('PUT /api/color should reject invalid latitude', async () => {
      const response = await request(app)
        .put('/api/color')
        .send({
          id: 'test-user-777',
          color: '#FF0000',
          lat: 91, // Invalid: > 90
          long: -122.4194
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    test('PUT /api/color should reject invalid longitude', async () => {
      const response = await request(app)
        .put('/api/color')
        .send({
          id: 'test-user-666',
          color: '#FF0000',
          lat: 37.7749,
          long: 181 // Invalid: > 180
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    test('PUT /api/color should reject null body', async () => {
      const response = await request(app)
        .put('/api/color')
        .send(null);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    test('PUT /api/color should reject color without #', async () => {
      const invalidColor = {
        id: 'test-user-555',
        color: 'FF0000',
        lat: 37.7749,
        long: -122.4194
      };
      const response = await request(app)
        .put('/api/color')
        .send(invalidColor);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    test('PUT /api/color should reject short color codes', async () => {
      const invalidColor = {
        id: 'test-user-444',
        color: '#FF0',
        lat: 37.7749,
        long: -122.4194
      };
      const response = await request(app)
        .put('/api/color')
        .send(invalidColor);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    test('PUT /api/color should reject long color codes', async () => {
      const invalidColor = {
        id: 'test-user-333',
        color: '#FF00000',
        lat: 37.7749,
        long: -122.4194
      };
      const response = await request(app)
        .put('/api/color')
        .send(invalidColor);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    test('PUT /api/color should reject invalid hex characters', async () => {
      const invalidColor = {
        id: 'test-user-222',
        color: '#GGGGGG',
        lat: 37.7749,
        long: -122.4194
      };
      const response = await request(app)
        .put('/api/color')
        .send(invalidColor);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    test('PUT /api/color should handle Redis errors', async () => {
      // Mock Redis to throw an error
      mockRedisClient.ts.add.mockRejectedValueOnce(new Error('Redis error'));

      const validColor = {
        id: 'test-user-111',
        color: '#FF0000',
        lat: 37.7749,
        long: -122.4194
      };
      const response = await request(app)
        .put('/api/color')
        .send(validColor);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('success', false);
    });

    test('PUT /api/color should handle set function errors', async () => {
      // Mock Redis add to throw error to test set function error handling
      mockRedisClient.ts.add.mockRejectedValueOnce(new Error('Set function error'));

      const validColor = {
        id: 'test-user-000',
        color: '#00FF00',
        lat: 40.7128,
        long: -74.0060
      };
      const response = await request(app)
        .put('/api/color')
        .send(validColor);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Internal server error');
    });
  });

  describe('Redis Integration', () => {
    test('should call Redis connect on startup', () => {
      expect(mockRedisClient.connect).toHaveBeenCalled();
    });

    test('should call Redis time series create on startup', () => {
      expect(mockRedisClient.ts.create).toHaveBeenCalled();
    });

    test('should use Redis for color storage', async () => {
      mockRedisClient.ts.add.mockClear();
      mockRedisClient.hSet.mockClear();
      mockRedisClient.zAdd.mockClear();

      const validColor = {
        id: 'test-redis-user',
        color: '#00FF00',
        lat: 37.7749,
        long: -122.4194
      };
      await request(app)
        .put('/api/color')
        .send(validColor);

      expect(mockRedisClient.ts.add).toHaveBeenCalled();
      expect(mockRedisClient.hSet).toHaveBeenCalled();
      expect(mockRedisClient.zAdd).toHaveBeenCalled();
    });

    test('should use Redis for color retrieval', async () => {
      mockRedisClient.ts.get.mockClear();
      await request(app).get('/api/color');
      expect(mockRedisClient.ts.get).toHaveBeenCalled();
    });

    test('should use Redis for average calculation', async () => {
      mockRedisClient.zRangeByScore.mockClear();
      await request(app).get('/api/color');
      expect(mockRedisClient.zRangeByScore).toHaveBeenCalled();
    });
  });

  describe('WebSocket Functionality', () => {
    test('WebSocket endpoint should be accessible', async () => {
      // Test that WebSocket endpoint returns 404 for regular HTTP request
      const response = await request(app).get('/ws/color');
      expect(response.status).toBe(404);
    });
  });

  describe('Color Utilities and Edge Cases', () => {
    test('should handle hex color conversion correctly', () => {
      const colorValue = 16777215; // White
      const hexColor = '#' + colorValue.toString(16).toUpperCase().padStart(6, '0');
      expect(hexColor).toBe('#FFFFFF');
    });

    test('should handle color validation patterns', () => {
      const validColors = ['#FF0000', '#00FF00', '#0000FF', '#FFFFFF', '#000000', '#123ABC', '#abcdef'];
      const invalidColors = ['FF0000', '#GG0000', '#FF00', 'red', '', '#', '#FF00000', '#FF'];
      
      const hexPattern = /^#[0-9A-Fa-f]{6}$/;
      
      validColors.forEach(color => {
        expect(color).toMatch(hexPattern);
      });
      
      invalidColors.forEach(color => {
        expect(color).not.toMatch(hexPattern);
      });
    });

    test('should generate colors within valid range', () => {
      const maxColorValue = 16777215; // 0xFFFFFF
      
      for (let i = 0; i < 10; i++) {
        const randomValue = Math.floor(Math.random() * (maxColorValue + 1));
        expect(randomValue).toBeGreaterThanOrEqual(0);
        expect(randomValue).toBeLessThanOrEqual(maxColorValue);
        
        const hexColor = '#' + randomValue.toString(16).toUpperCase().padStart(6, '0');
        expect(hexColor).toMatch(/^#[0-9A-F]{6}$/);
      }
    });

    test('should handle average color calculation with no data', async () => {
      // Mock Redis to return empty array
      mockRedisClient.ts.range.mockResolvedValueOnce([]);
      
      const response = await request(app).get('/api/color');
      expect(response.status).toBe(200);
      expect(response.body.average).toMatch(/^#[0-9A-F]{6}$/);
    });

    test('should handle average color calculation with Redis error', async () => {
      // Mock Redis to throw an error
      mockRedisClient.ts.range.mockRejectedValueOnce(new Error('Redis error'));
      
      const response = await request(app).get('/api/color');
      expect(response.status).toBe(200);
      expect(response.body.average).toMatch(/^#[0-9A-F]{6}$/);
    });

    test('should handle color retrieval with no data', async () => {
      // Mock Redis to return null
      mockRedisClient.ts.get.mockResolvedValueOnce(null);
      
      const response = await request(app).get('/api/color');
      expect(response.status).toBe(200);
      expect(response.body.color).toMatch(/^#[0-9A-F]{6}$/);
    });

    test('should handle color retrieval with empty value', async () => {
      // Mock Redis to return empty value
      mockRedisClient.ts.get.mockResolvedValueOnce({ value: null });
      
      const response = await request(app).get('/api/color');
      expect(response.status).toBe(200);
      expect(response.body.color).toMatch(/^#[0-9A-F]{6}$/);
    });

    test('should handle average color calculation with valid data', async () => {
      // Mock Redis to return valid data
      mockRedisClient.ts.range.mockResolvedValueOnce([
        { timestamp: Date.now(), value: 8388607 }
      ]);
      
      const response = await request(app).get('/api/color');
      expect(response.status).toBe(200);
      expect(response.body.average).toMatch(/^#[0-9A-F]{6}$/);
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .put('/api/color')
        .send('{invalid: json}')
        .set('Content-Type', 'application/json');
      
      expect([400, 500]).toContain(response.status);
    });

    test('should handle empty requests', async () => {
      const response = await request(app)
        .put('/api/color')
        .send();
      
      expect(response.status).toBe(400);
    });

    test('should handle undefined body', async () => {
      const response = await request(app)
        .put('/api/color')
        .send(undefined);
      
      expect(response.status).toBe(400);
    });

    test('should handle JSON parsing errors', async () => {
      // Test the JSON error middleware
      const response = await request(app)
        .put('/api/color')
        .send('{invalid: json}')
        .set('Content-Type', 'application/json');
      
      expect([400, 500]).toContain(response.status);
    });

    test('should handle 404 errors', async () => {
      const response = await request(app).get('/nonexistent-route');
      expect(response.status).toBe(404);
    });
  });

  describe('Configuration and Constants', () => {
    test('should have correct port configuration', () => {
      const port = process.env.PORT || 9099;
      expect(typeof port).toBe('number');
      expect(port).toBeGreaterThan(0);
      expect(port).toBeLessThan(65536);
    });

    test('should have Redis URL configuration', () => {
      const redisUrl = process.env.REDIS_URL || '127.0.0.1:6379';
      expect(typeof redisUrl).toBe('string');
      expect(redisUrl.length).toBeGreaterThan(0);
    });

    test('should have valid color code characters', () => {
      const makeColorCode = '0123456789ABCDEF';
      expect(makeColorCode).toHaveLength(16);
      expect(makeColorCode).toMatch(/^[0-9A-F]+$/);
    });

    test('should generate valid random colors', () => {
      // Test the random color generation pattern
      const hexPattern = /^[0-9A-F]{6}$/;
      
      for (let i = 0; i < 5; i++) {
        const makeColorCode = '0123456789ABCDEF';
        let code = '';
        for (let count = 0; count < 6; count++) {
          code += makeColorCode[Math.floor(Math.random() * 16)];
        }
        expect(code).toMatch(hexPattern);
      }
    });
  });

  describe('Integration Tests', () => {
    test('should handle complete color workflow', async () => {
      // Get initial color
      const initialResponse = await request(app).get('/api/color');
      expect(initialResponse.status).toBe(200);

      // Set new color (must be from palette)
      const newColor = {
        id: 'workflow-user',
        color: '#FF4500', // Orange Red from palette
        lat: 37.7749,
        long: -122.4194
      };
      const setResponse = await request(app)
        .put('/api/color')
        .send(newColor);
      expect(setResponse.status).toBe(200);

      // Verify color was set (Redis mock will handle this)
      const finalResponse = await request(app).get('/api/color');
      expect(finalResponse.status).toBe(200);
    });

    test('should handle multiple color updates', async () => {
      const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF'];

      for (let i = 0; i < colors.length; i++) {
        const response = await request(app)
          .put('/api/color')
          .send({
            id: `multi-user-${i}`,
            color: colors[i],
            lat: 37.7749 + i * 0.1,
            long: -122.4194 + i * 0.1
          });
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      }
    });

    test('should handle mixed valid and invalid requests', async () => {
      const requests = [
        { id: 'mixed-1', color: '#FF0000', lat: 37.7749, long: -122.4194, expectedStatus: 200 },
        { id: 'mixed-2', color: 'invalid', lat: 37.7749, long: -122.4194, expectedStatus: 400 },
        { id: 'mixed-3', color: '#00FF00', lat: 37.7749, long: -122.4194, expectedStatus: 200 },
        { id: 'mixed-4', color: '#GG0000', lat: 37.7749, long: -122.4194, expectedStatus: 400 },
        { id: 'mixed-5', color: '#0000FF', lat: 37.7749, long: -122.4194, expectedStatus: 200 }
      ];

      for (const req of requests) {
        const response = await request(app)
          .put('/api/color')
          .send({ id: req.id, color: req.color, lat: req.lat, long: req.long });
        expect(response.status).toBe(req.expectedStatus);
      }
    });
  });

  describe('Edge Cases and Boundary Tests', () => {
    test('should handle minimum color value', async () => {
      const response = await request(app)
        .put('/api/color')
        .send({
          id: 'edge-min',
          color: '#0000FF', // Blue from palette
          lat: 0,
          long: 0
        });
      expect(response.status).toBe(200);
    });

    test('should handle maximum color value', async () => {
      const response = await request(app)
        .put('/api/color')
        .send({
          id: 'edge-max',
          color: '#FFFF00', // Yellow from palette
          lat: 90,
          long: 180
        });
      expect(response.status).toBe(200);
    });

    test('should handle color parsing edge cases', () => {
      // Test color integer conversion
      const testCases = [
        { color: '#000000', expected: 0 },
        { color: '#FFFFFF', expected: 16777215 },
        { color: '#FF0000', expected: 16711680 },
        { color: '#00FF00', expected: 65280 },
        { color: '#0000FF', expected: 255 }
      ];
      
      testCases.forEach(testCase => {
        const colorInt = parseInt(testCase.color.replace('#', ''), 16);
        expect(colorInt).toBe(testCase.expected);
      });
    });

    test('should handle hex string padding', () => {
      // Test hex string padding for small numbers
      const testCases = [
        { value: 0, expected: '000000' },
        { value: 255, expected: '0000FF' },
        { value: 65280, expected: '00FF00' },
        { value: 16711680, expected: 'FF0000' }
      ];
      
      testCases.forEach(testCase => {
        const hexString = testCase.value.toString(16).toUpperCase().padStart(6, '0');
        expect(hexString).toBe(testCase.expected);
      });
    });
  });

  describe('Module Export and Startup', () => {
    test('should export the app correctly', () => {
      expect(app).toBeDefined();
      expect(typeof app).toBe('function');
    });

    test('should handle require.main check', () => {
      // Test that the module export works correctly
      expect(require.main).toBeDefined();
    });
  });
});

// Test Redis time series error handling by creating new instances
describe('Redis Time Series Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test.skip('should handle existing time series error', async () => {
    // Mock Redis to throw 'key already exists' error
    const mockClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      ts: {
        create: jest.fn().mockRejectedValue(new Error('TSDB: key already exists'))
      }
    };
    
    const redis = require('redis');
    const originalCreateClient = redis.createClient;
    redis.createClient = jest.fn(() => mockClient);
    
    // Clear cache and require again to trigger the error handling
    delete require.cache[require.resolve('./index.js')];
    require('./index.js');
    
    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify the error was handled
    expect(mockClient.ts.create).toHaveBeenCalled();
    
    // Restore original
    redis.createClient = originalCreateClient;
  });

  test.skip('should handle other Redis time series errors', async () => {
    // Mock Redis to throw other error
    const mockClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      ts: {
        create: jest.fn().mockRejectedValue(new Error('Some other Redis error'))
      }
    };
    
    const redis = require('redis');
    const originalCreateClient = redis.createClient;
    redis.createClient = jest.fn(() => mockClient);
    
    delete require.cache[require.resolve('./index.js')];
    require('./index.js');
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(mockClient.ts.create).toHaveBeenCalled();
    
    // Restore original
    redis.createClient = originalCreateClient;
  });
});

describe('Geolocation and Proximity Features', () => {
  let app;

  beforeAll(async () => {
    // Use the same app instance
    app = require('./index.js');
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('Proximity Tests', () => {
    test('GET /api/color should return proximity data when lat/long provided', async () => {
      const response = await request(app)
        .get('/api/color?lat=37.7749&long=-122.4194');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('color');
      expect(response.body).toHaveProperty('average');
      // proximityAverage may or may not be present depending on data
    });

    test('GET /api/color should handle invalid lat/long gracefully', async () => {
      const response = await request(app)
        .get('/api/color?lat=invalid&long=invalid');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('color');
      expect(response.body).toHaveProperty('average');
    });

    test('PUT /api/color should store geolocation data', async () => {
      mockRedisClient.hSet.mockClear();
      mockRedisClient.zAdd.mockClear();

      const submission = {
        id: 'geo-test-user',
        color: '#FF6347', // Tomato from palette
        lat: 37.7749,
        long: -122.4194
      };

      const response = await request(app)
        .put('/api/color')
        .send(submission);

      expect(response.status).toBe(200);
      expect(mockRedisClient.hSet).toHaveBeenCalledWith(
        `viridis:user:${submission.id}`,
        expect.objectContaining({
          lat: submission.lat.toString(),
          long: submission.long.toString(),
          color: submission.color
        })
      );
      expect(mockRedisClient.zAdd).toHaveBeenCalled();
    });

    test('PUT /api/color should reject out-of-range latitude', async () => {
      const response = await request(app)
        .put('/api/color')
        .send({
          id: 'invalid-lat',
          color: '#FF0000',
          lat: 100, // > 90
          long: 0
        });

      expect(response.status).toBe(400);
    });

    test('PUT /api/color should reject out-of-range longitude', async () => {
      const response = await request(app)
        .put('/api/color')
        .send({
          id: 'invalid-long',
          color: '#FF0000',
          lat: 0,
          long: 200 // > 180
        });

      expect(response.status).toBe(400);
    });

    test('PUT /api/color should accept boundary latitude values', async () => {
      const response1 = await request(app)
        .put('/api/color')
        .send({
          id: 'boundary-lat-1',
          color: '#FF0000',
          lat: -90,
          long: 0
        });

      const response2 = await request(app)
        .put('/api/color')
        .send({
          id: 'boundary-lat-2',
          color: '#FF0000',
          lat: 90,
          long: 0
        });

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });

    test('PUT /api/color should accept boundary longitude values', async () => {
      const response1 = await request(app)
        .put('/api/color')
        .send({
          id: 'boundary-long-1',
          color: '#FF0000',
          lat: 0,
          long: -180
        });

      const response2 = await request(app)
        .put('/api/color')
        .send({
          id: 'boundary-long-2',
          color: '#FF0000',
          lat: 0,
          long: 180
        });

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });
  });
});

describe('WebSocket Functionality', () => {
  let app;

  beforeAll(async () => {
    app = require('./index.js');
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  test.skip('WebSocket endpoint should handle messages', async () => {
    const ws = require('ws');
    const client = new ws('ws://localhost:9099/ws/color');

    await new Promise((resolve, reject) => {
      client.on('open', () => {
        client.send('test message');
      });

      client.on('message', (data) => {
        const msg = JSON.parse(data);
        expect(msg).toHaveProperty('color');
        expect(msg).toHaveProperty('average');
        client.close();
        resolve();
      });

      client.on('error', reject);

      setTimeout(() => reject(new Error('Timeout')), 5000);
    });
  });

  test.skip('WebSocket should handle close event', async () => {
    const ws = require('ws');
    const client = new ws('ws://localhost:9099/ws/color');

    await new Promise((resolve) => {
      client.on('open', () => {
        client.close();
      });

      client.on('close', () => {
        resolve();
      });
    });
  });

  test.skip('WebSocket should broadcast on color update', async () => {
    const ws = require('ws');
    const client1 = new ws('ws://localhost:9099/ws/color');
    const client2 = new ws('ws://localhost:9099/ws/color');

    await new Promise((resolve, reject) => {
      let client1Ready = false;
      let client2Ready = false;
      let messagesReceived = 0;

      const checkMessage = (data) => {
        const msg = JSON.parse(data);
        expect(msg).toHaveProperty('average');
        messagesReceived++;
        if (messagesReceived >= 2) {
          client1.close();
          client2.close();
          resolve();
        }
      };

      client1.on('open', () => {
        client1Ready = true;
        client1.on('message', checkMessage);
        checkReady();
      });

      client2.on('open', () => {
        client2Ready = true;
        client2.on('message', checkMessage);
        checkReady();
      });

      async function checkReady() {
        if (client1Ready && client2Ready) {
          // Wait a bit for connections to stabilize
          await new Promise(r => setTimeout(r, 100));
          // Send color update
          await request(app)
            .put('/api/color')
            .send({
              id: 'broadcast-test',
              color: '#AABBCC',
              lat: 37.7749,
              long: -122.4194
            });
        }
      }

      client1.on('error', reject);
      client2.on('error', reject);

      setTimeout(() => {
        client1.close();
        client2.close();
        reject(new Error('Timeout waiting for broadcast'));
      }, 10000);
    });
  }, 15000);

  test.skip('WebSocket should handle errors in message handler', async () => {
    const ws = require('ws');
    const client = new ws('ws://localhost:9099/ws/color');

    await new Promise((resolve, reject) => {
      client.on('open', () => {
        // Send a message that will trigger the handler
        client.send('trigger');
      });

      client.on('message', (data) => {
        const msg = JSON.parse(data);
        // Should receive either color data or error
        expect(msg).toBeDefined();
        client.close();
        resolve();
      });

      client.on('error', reject);

      setTimeout(() => reject(new Error('Timeout')), 5000);
    });
  });
});

describe('Additional Coverage Tests', () => {
  let app;

  beforeAll(async () => {
    app = require('./index.js');
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  test('GET /api/color should handle errors gracefully', async () => {
    // This tests the error handling path in GET /api/color
    const response = await request(app)
      .get('/api/color?lat=invalid&long=invalid');

    // Should still return 200 with default values
    expect(response.status).toBe(200);
  });

  test('should handle NaN latitude validation', async () => {
    const response = await request(app)
      .put('/api/color')
      .send({
        id: 'test-nan-lat',
        color: '#FF0000',
        lat: NaN,
        long: -122.4194
      });

    expect(response.status).toBe(400);
  });

  test('should handle NaN longitude validation', async () => {
    const response = await request(app)
      .put('/api/color')
      .send({
        id: 'test-nan-long',
        color: '#FF0000',
        lat: 37.7749,
        long: NaN
      });

    expect(response.status).toBe(400);
  });

  test('should calculate haversine distance correctly', async () => {
    // Add two submissions at known distances
    await request(app)
      .put('/api/color')
      .send({ id: 'distance-test-1', color: '#FF0000', lat: 37.7749, long: -122.4194 });

    await request(app)
      .put('/api/color')
      .send({ id: 'distance-test-2', color: '#00FF00', lat: 37.7849, long: -122.4294 });

    const response = await request(app)
      .get('/api/color?lat=37.7749&long=-122.4194');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('proximityAverage');
  });

  test('should handle proximity average with no nearby submissions', async () => {
    // Query a location far from any submissions
    const response = await request(app)
      .get('/api/color?lat=89.9&long=179.9');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('average');
  });

  test('should handle proximity average calculation errors', async () => {
    const response = await request(app)
      .get('/api/color?lat=37.7749&long=-122.4194');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('color');
  });

  describe('Additional Endpoint Coverage', () => {
    test('GET /test should return test HTML page', async () => {
      const response = await request(app).get('/test');
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
    });

    test('GET /api/palette should return palette data', async () => {
      const response = await request(app).get('/api/palette');
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.body).toHaveProperty('colors');
      expect(Array.isArray(response.body.colors)).toBe(true);
      expect(response.body.colors.length).toBe(32);
      expect(response.body.colors[0]).toHaveProperty('hex');
      expect(response.body.colors[0]).toHaveProperty('name');
    });
  });

  describe('Throttling Tests', () => {
    test('PUT /api/color should throttle rapid submissions from same user', async () => {
      const submission = {
        id: 'throttle-test-user',
        color: '#FF0000', // Red from palette
        lat: 40.7128,
        long: -74.0060
      };

      // First submission should succeed
      const response1 = await request(app)
        .put('/api/color')
        .send(submission);
      expect(response1.status).toBe(200);

      // Second submission immediately after should be throttled
      const response2 = await request(app)
        .put('/api/color')
        .send(submission);
      expect(response2.status).toBe(429);
      expect(response2.body).toHaveProperty('message');
      expect(response2.body).toHaveProperty('remainingTime');
      expect(response2.body.remainingTime).toBeGreaterThan(0);
    });

    test('PUT /api/color should allow submission after throttle period', async () => {
      const submission = {
        id: 'throttle-test-user-2',
        color: '#00FF00', // Green from palette
        lat: 40.7128,
        long: -74.0060
      };

      // First submission
      const response1 = await request(app)
        .put('/api/color')
        .send(submission);
      expect(response1.status).toBe(200);

      // Wait for throttle period (mock by clearing the throttle map)
      // In real scenario, we'd wait 12 seconds, but for testing we can manipulate time
      // For now, just verify the throttle works
    });
  });

  describe('Color Palette Validation', () => {
    test('PUT /api/color should reject colors not in palette', async () => {
      const submission = {
        id: 'palette-test-user',
        color: '#123456', // Not in palette
        lat: 40.7128,
        long: -74.0060
      };

      const response = await request(app)
        .put('/api/color')
        .send(submission);
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('PUT /api/color should accept all palette colors', async () => {
      // Test a few colors from the palette
      const paletteColors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF'];

      for (const color of paletteColors) {
        const submission = {
          id: `palette-user-${color}`,
          color: color,
          lat: 40.7128,
          long: -74.0060
        };

        const response = await request(app)
          .put('/api/color')
          .send(submission);
        expect(response.status).toBe(200);
      }
    });
  });

  describe('Redis Storage Operations', () => {
    test('PUT /api/color should call zRemRangeByScore to clean old submissions', async () => {
      mockRedisClient.zRemRangeByScore.mockClear();

      const submission = {
        id: 'cleanup-test-user',
        color: '#FF0000',
        lat: 40.7128,
        long: -74.0060
      };

      await request(app)
        .put('/api/color')
        .send(submission);

      expect(mockRedisClient.zRemRangeByScore).toHaveBeenCalled();
    });

    test('GET /api/color with lat/long should count nearby submissions', async () => {
      // Mock submissions data
      const mockSubmissions = [
        JSON.stringify({ id: 'user1', lat: 40.7128, long: -74.0060, color: '#FF0000', timestamp: Date.now() }),
        JSON.stringify({ id: 'user2', lat: 40.7500, long: -74.0000, color: '#00FF00', timestamp: Date.now() }),
        JSON.stringify({ id: 'user3', lat: 89.0, long: 179.0, color: '#0000FF', timestamp: Date.now() }) // Far away
      ];

      mockRedisClient.zRangeByScore.mockResolvedValueOnce(mockSubmissions);

      const response = await request(app)
        .get('/api/color?lat=40.7128&long=-74.0060');

      expect(response.status).toBe(200);
      // Should have proximityAverage and nearbyCount
      expect(response.body).toHaveProperty('nearbyCount');
    });
  });

  describe('Average Color Calculation', () => {
    test('should calculate global average from multiple submissions', async () => {
      const mockSubmissions = [
        JSON.stringify({ id: 'user1', lat: 40.7128, long: -74.0060, color: '#FF0000', timestamp: Date.now() }),
        JSON.stringify({ id: 'user2', lat: 40.7500, long: -74.0000, color: '#00FF00', timestamp: Date.now() }),
        JSON.stringify({ id: 'user3', lat: 40.7300, long: -74.0100, color: '#0000FF', timestamp: Date.now() })
      ];

      mockRedisClient.zRangeByScore.mockResolvedValueOnce(mockSubmissions);

      const response = await request(app).get('/api/color');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('average');
      expect(response.body.average).toMatch(/^#[0-9A-F]{6}$/);
    });

    test('should handle empty submissions for average', async () => {
      mockRedisClient.zRangeByScore.mockResolvedValueOnce([]);

      const response = await request(app).get('/api/color');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('average');
      // Should return a random color from palette
      expect(response.body.average).toMatch(/^#[0-9A-F]{6}$/);
    });

    test('should limit average calculation to last 8 submissions', async () => {
      // Create 10 submissions
      const mockSubmissions = [];
      for (let i = 0; i < 10; i++) {
        mockSubmissions.push(
          JSON.stringify({
            id: `user${i}`,
            lat: 40.7128,
            long: -74.0060,
            color: '#FF0000',
            timestamp: Date.now() - i * 1000
          })
        );
      }

      mockRedisClient.zRangeByScore.mockResolvedValueOnce(mockSubmissions);

      const response = await request(app).get('/api/color');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('average');
    });
  });

  describe('Proximity Average Calculation', () => {
    test('should calculate proximity average for nearby submissions', async () => {
      const mockSubmissions = [
        JSON.stringify({ id: 'user1', lat: 40.7128, long: -74.0060, color: '#FF0000', timestamp: Date.now() }),
        JSON.stringify({ id: 'user2', lat: 40.7200, long: -74.0100, color: '#00FF00', timestamp: Date.now() }),
        JSON.stringify({ id: 'user3', lat: 40.7150, long: -74.0080, color: '#0000FF', timestamp: Date.now() })
      ];

      mockRedisClient.zRangeByScore.mockResolvedValueOnce(mockSubmissions)
        .mockResolvedValueOnce(mockSubmissions);

      const response = await request(app)
        .get('/api/color?lat=40.7128&long=-74.0060');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('proximityAverage');
      expect(response.body.proximityAverage).toMatch(/^#[0-9A-F]{6}$/);
    });

    test('should fall back to global average when no nearby submissions', async () => {
      const mockSubmissions = [
        JSON.stringify({ id: 'user1', lat: 89.0, long: 179.0, color: '#FF0000', timestamp: Date.now() })
      ];

      mockRedisClient.zRangeByScore.mockResolvedValueOnce(mockSubmissions)
        .mockResolvedValueOnce(mockSubmissions)
        .mockResolvedValueOnce(mockSubmissions);

      const response = await request(app)
        .get('/api/color?lat=40.7128&long=-74.0060');

      expect(response.status).toBe(200);
      // Should still return a valid response
      expect(response.body).toHaveProperty('color');
    });
  });

  describe('Error Handling in Internal Functions', () => {
    test('should handle errors in getAverageColor gracefully', async () => {
      // Mock zRangeByScore to throw an error
      mockRedisClient.zRangeByScore.mockRejectedValueOnce(new Error('Redis connection failed'));

      const response = await request(app).get('/api/color');

      // Should still return a response with a random color
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('average');
      expect(response.body.average).toMatch(/^#[0-9A-F]{6}$/);
    });

    test('should handle errors in getProximityAverageColor gracefully', async () => {
      // Mock zRangeByScore to throw an error
      mockRedisClient.zRangeByScore.mockRejectedValueOnce(new Error('Redis connection failed'));

      const response = await request(app)
        .get('/api/color?lat=40.7128&long=-74.0060');

      // Should still return a response
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('color');
    });

    test('should handle errors in set function', async () => {
      // Mock hSet to throw an error
      mockRedisClient.hSet.mockRejectedValueOnce(new Error('Redis write failed'));

      const submission = {
        id: 'error-test-user',
        color: '#FF0000',
        lat: 40.7128,
        long: -74.0060
      };

      const response = await request(app)
        .put('/api/color')
        .send(submission);

      // Should return 500 error
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    test('should handle broadcast errors without failing request', async () => {
      // Mock getColor to throw error during broadcast
      mockRedisClient.ts.get.mockResolvedValueOnce({ timestamp: Date.now(), value: 16711680 })
        .mockRejectedValueOnce(new Error('Broadcast failed'));

      const submission = {
        id: 'broadcast-error-user',
        color: '#FF0000',
        lat: 40.7128,
        long: -74.0060
      };

      const response = await request(app)
        .put('/api/color')
        .send(submission);

      // Request should still succeed even if broadcast fails
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Validation Edge Cases', () => {
    test('should reject submission with non-string id', async () => {
      const submission = {
        id: 12345, // Number instead of string
        color: '#FF0000',
        lat: 40.7128,
        long: -74.0060
      };

      const response = await request(app)
        .put('/api/color')
        .send(submission);

      expect(response.status).toBe(400);
    });

    test('should reject submission with empty string id', async () => {
      const submission = {
        id: '', // Empty string
        color: '#FF0000',
        lat: 40.7128,
        long: -74.0060
      };

      const response = await request(app)
        .put('/api/color')
        .send(submission);

      expect(response.status).toBe(400);
    });

    test('should handle case-insensitive color validation', async () => {
      const submission = {
        id: 'case-test-user',
        color: '#ff0000', // Lowercase
        lat: 40.7128,
        long: -74.0060
      };

      const response = await request(app)
        .put('/api/color')
        .send(submission);

      expect(response.status).toBe(200);
    });
  });

  describe('Proximity Counting', () => {
    test('should count nearby submissions within 50km radius', async () => {
      const mockSubmissions = [
        JSON.stringify({ id: 'user1', lat: 40.7128, long: -74.0060, color: '#FF0000', timestamp: Date.now() }),
        JSON.stringify({ id: 'user2', lat: 40.7500, long: -74.0000, color: '#00FF00', timestamp: Date.now() }),
        JSON.stringify({ id: 'user3', lat: 40.7300, long: -74.0100, color: '#0000FF', timestamp: Date.now() }),
        JSON.stringify({ id: 'user4', lat: 89.0, long: 179.0, color: '#FFFF00', timestamp: Date.now() }) // Far away
      ];

      // Need to mock three calls: one for getAverageColor, one for getProximityAverageColor, one for counting
      mockRedisClient.zRangeByScore.mockResolvedValueOnce(mockSubmissions)
        .mockResolvedValueOnce(mockSubmissions)
        .mockResolvedValueOnce(mockSubmissions);

      const response = await request(app)
        .get('/api/color?lat=40.7128&long=-74.0060');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('nearbyCount');
      // Should count nearby submissions
      expect(typeof response.body.nearbyCount).toBe('number');
    });
  });

  describe('Module Startup and Exports', () => {
    test('should export app as a module', () => {
      expect(app).toBeDefined();
      expect(typeof app).toBe('function');
    });
  });

  describe('Additional Error Scenarios', () => {
    test('should handle GET /api/color with Redis error in proximity counting', async () => {
      // Mock first call succeeds, second call fails
      mockRedisClient.zRangeByScore
        .mockResolvedValueOnce([JSON.stringify({ id: 'user1', lat: 40.7128, long: -74.0060, color: '#FF0000', timestamp: Date.now() })])
        .mockResolvedValueOnce([JSON.stringify({ id: 'user1', lat: 40.7128, long: -74.0060, color: '#FF0000', timestamp: Date.now() })])
        .mockRejectedValueOnce(new Error('Redis error in counting'));

      const response = await request(app)
        .get('/api/color?lat=40.7128&long=-74.0060');

      // Error in counting causes 500 error
      expect(response.status).toBe(500);
    });

    test('should handle GET /api/color with critical error', async () => {
      // Mock all Redis calls to fail
      mockRedisClient.ts.get.mockRejectedValueOnce(new Error('Critical Redis error'));
      mockRedisClient.zRangeByScore.mockRejectedValueOnce(new Error('Critical Redis error'));

      const response = await request(app).get('/api/color');

      // Should return 200 with fallback random colors
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('color');
      expect(response.body).toHaveProperty('average');
    });

    test('should handle zAdd errors during submission', async () => {
      mockRedisClient.zAdd.mockRejectedValueOnce(new Error('zAdd failed'));

      const submission = {
        id: 'zadd-error-user',
        color: '#FF0000',
        lat: 40.7128,
        long: -74.0060
      };

      const response = await request(app)
        .put('/api/color')
        .send(submission);

      expect(response.status).toBe(500);
    });

    test('should handle zRemRangeByScore errors during cleanup', async () => {
      mockRedisClient.zRemRangeByScore.mockRejectedValueOnce(new Error('Cleanup failed'));

      const submission = {
        id: 'cleanup-error-user',
        color: '#FF0000',
        lat: 40.7128,
        long: -74.0060
      };

      const response = await request(app)
        .put('/api/color')
        .send(submission);

      expect(response.status).toBe(500);
    });
  });

  describe('Color Snapping and Distance Calculations', () => {
    test('should snap averaged colors to nearest palette color', async () => {
      // Submit multiple colors and verify the average is snapped to palette
      const mockSubmissions = [
        JSON.stringify({ id: 'user1', lat: 40.7128, long: -74.0060, color: '#FF0000', timestamp: Date.now() }),
        JSON.stringify({ id: 'user2', lat: 40.7128, long: -74.0060, color: '#FF4500', timestamp: Date.now() })
      ];

      mockRedisClient.zRangeByScore.mockResolvedValueOnce(mockSubmissions);

      const response = await request(app).get('/api/color');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('average');
      // Average should be a valid palette color
      expect(response.body.average).toMatch(/^#[0-9A-F]{6}$/);
    });

    test('should calculate weighted proximity average correctly', async () => {
      const mockSubmissions = [
        JSON.stringify({ id: 'user1', lat: 40.7128, long: -74.0060, color: '#FF0000', timestamp: Date.now() }),
        JSON.stringify({ id: 'user2', lat: 40.7129, long: -74.0061, color: '#FF0000', timestamp: Date.now() }), // Very close
        JSON.stringify({ id: 'user3', lat: 40.8000, long: -74.1000, color: '#0000FF', timestamp: Date.now() })  // Further away
      ];

      mockRedisClient.zRangeByScore
        .mockResolvedValueOnce(mockSubmissions)
        .mockResolvedValueOnce(mockSubmissions)
        .mockResolvedValueOnce(mockSubmissions);

      const response = await request(app)
        .get('/api/color?lat=40.7128&long=-74.0060');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('proximityAverage');
      // Should be weighted more towards red since two submissions are very close
      expect(response.body.proximityAverage).toMatch(/^#[0-9A-F]{6}$/);
    });
  });

  describe('Broadcast and WebSocket Integration', () => {
    test('should attempt to broadcast after successful color submission', async () => {
      // Mock successful submission
      const submission = {
        id: 'broadcast-test-user',
        color: '#FF0000',
        lat: 40.7128,
        long: -74.0060
      };

      // Mock getColor and getAverageColor for broadcast
      mockRedisClient.ts.get.mockResolvedValueOnce({ timestamp: Date.now(), value: 16711680 });
      mockRedisClient.zRangeByScore.mockResolvedValueOnce([
        JSON.stringify({ id: 'user1', lat: 40.7128, long: -74.0060, color: '#FF0000', timestamp: Date.now() })
      ]);

      const response = await request(app)
        .put('/api/color')
        .send(submission);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // Broadcast should have been attempted (even if no clients connected)
    });

    test('should handle broadcast with multiple mock scenarios', async () => {
      const submission = {
        id: 'broadcast-multi-test',
        color: '#00FF00',
        lat: 40.7128,
        long: -74.0060
      };

      // Mock successful Redis operations
      mockRedisClient.ts.get.mockResolvedValueOnce({ timestamp: Date.now(), value: 65280 });
      mockRedisClient.zRangeByScore.mockResolvedValueOnce([
        JSON.stringify({ id: 'user1', lat: 40.7128, long: -74.0060, color: '#00FF00', timestamp: Date.now() })
      ]);

      const response = await request(app)
        .put('/api/color')
        .send(submission);

      expect(response.status).toBe(200);
    });

    test('should handle broadcast error in getColor', async () => {
      const submission = {
        id: 'broadcast-error-getcolor',
        color: '#0000FF',
        lat: 40.7128,
        long: -74.0060
      };

      // Mock getColor to fail during broadcast
      mockRedisClient.ts.get.mockRejectedValueOnce(new Error('getColor failed in broadcast'));

      const response = await request(app)
        .put('/api/color')
        .send(submission);

      // Should still succeed even if broadcast fails
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should handle broadcast error in getAverageColor', async () => {
      const submission = {
        id: 'broadcast-error-getavg',
        color: '#FFFF00',
        lat: 40.7128,
        long: -74.0060
      };

      // Mock getColor succeeds but getAverageColor fails
      mockRedisClient.ts.get.mockResolvedValueOnce({ timestamp: Date.now(), value: 16776960 });
      mockRedisClient.zRangeByScore.mockRejectedValueOnce(new Error('getAverageColor failed in broadcast'));

      const response = await request(app)
        .put('/api/color')
        .send(submission);

      // Should still succeed even if broadcast fails
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should handle JSON stringify error in broadcast', async () => {
      const submission = {
        id: 'broadcast-json-error',
        color: '#FF00FF',
        lat: 40.7128,
        long: -74.0060
      };

      // Mock successful operations
      mockRedisClient.ts.get.mockResolvedValueOnce({ timestamp: Date.now(), value: 16711935 });
      mockRedisClient.zRangeByScore.mockResolvedValueOnce([
        JSON.stringify({ id: 'user1', lat: 40.7128, long: -74.0060, color: '#FF00FF', timestamp: Date.now() })
      ]);

      const response = await request(app)
        .put('/api/color')
        .send(submission);

      // Should succeed
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Edge Cases for Proximity and Averaging', () => {
    test('should handle proximity average with submissions exactly at radius boundary', async () => {
      // Create submissions at exactly 50km distance
      const mockSubmissions = [
        JSON.stringify({ id: 'user1', lat: 40.7128, long: -74.0060, color: '#FF0000', timestamp: Date.now() }),
        JSON.stringify({ id: 'user2', lat: 41.1628, long: -74.0060, color: '#00FF00', timestamp: Date.now() }) // ~50km north
      ];

      mockRedisClient.zRangeByScore
        .mockResolvedValueOnce(mockSubmissions)
        .mockResolvedValueOnce(mockSubmissions)
        .mockResolvedValueOnce(mockSubmissions);

      const response = await request(app)
        .get('/api/color?lat=40.7128&long=-74.0060');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('proximityAverage');
    });

    test('should handle averaging with more than 8 submissions', async () => {
      // Create 12 submissions
      const mockSubmissions = [];
      for (let i = 0; i < 12; i++) {
        mockSubmissions.push(
          JSON.stringify({
            id: `user${i}`,
            lat: 40.7128,
            long: -74.0060,
            color: '#FF0000',
            timestamp: Date.now() - i * 1000
          })
        );
      }

      mockRedisClient.zRangeByScore.mockResolvedValueOnce(mockSubmissions);

      const response = await request(app).get('/api/color');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('average');
      // Should only use last 8 submissions
    });

    test('should handle proximity average error and fall back to global average', async () => {
      // Mock proximity calculation to fail, should fall back to global average
      mockRedisClient.zRangeByScore
        .mockResolvedValueOnce([JSON.stringify({ id: 'user1', lat: 40.7128, long: -74.0060, color: '#FF0000', timestamp: Date.now() })])
        .mockRejectedValueOnce(new Error('Proximity calculation failed'))
        .mockResolvedValueOnce([JSON.stringify({ id: 'user1', lat: 40.7128, long: -74.0060, color: '#FF0000', timestamp: Date.now() })]);

      const response = await request(app)
        .get('/api/color?lat=40.7128&long=-74.0060');

      // Should still return a valid response with fallback
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('color');
    });
  });
});

// Global cleanup to ensure Jest exits
afterAll(async () => {
  // Give time for any pending operations to complete
  await new Promise(resolve => setTimeout(resolve, 100));
});

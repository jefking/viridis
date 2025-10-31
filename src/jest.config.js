module.exports = {
  testEnvironment: 'node',
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    '**/*.js',
    '\!node_modules/**',
    '\!coverage/**',
    '\!jest.config.js'
  ],
  coverageThreshold: {
    global: {
      branches: 81,
      functions: 66,
      lines: 68,
      statements: 69
    }
  },
  testMatch: ['**/*.test.js', '**/*.spec.js']
};

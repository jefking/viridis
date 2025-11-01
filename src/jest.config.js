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
      branches: 88,
      functions: 75,
      lines: 88,
      statements: 88
    }
  },
  testMatch: ['**/*.test.js', '**/*.spec.js']
};

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
      branches: 80,
      functions: 70,
      lines: 80,
      statements: 80
    }
  },
  testMatch: ['**/*.test.js', '**/*.spec.js']
};

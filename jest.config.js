module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.spec.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    'server.js',
    '!src/**/*.test.js',
    '!src/jobs/**', // Exclude background jobs for now
  ],
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 30,
      lines: 30,
      statements: 30,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 10000,
  verbose: true,
};


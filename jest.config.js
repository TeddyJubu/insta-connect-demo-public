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
      branches: 20,
      functions: 15,
      lines: 20,
      statements: 20,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 10000,
  verbose: true,
};

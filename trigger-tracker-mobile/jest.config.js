module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.{js,ts,tsx}', '**/*.test.{js,ts,tsx}'],
  moduleFileExtensions: ['js', 'ts', 'tsx', 'json'],
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|expo|@expo)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'utils/**/*.js',
    '!**/node_modules/**',
  ],
};

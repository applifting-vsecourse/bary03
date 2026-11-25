// Integration tests: the real Nest app over HTTP (supertest) against a real
// Postgres test database. Run with `pnpm backend test:int`; unit tests are the
// "jest" block in package.json and skip these files.
/** @type {import('jest').Config} */
module.exports = {
  rootDir: './',
  moduleFileExtensions: ['js', 'mjs', 'cjs', 'json', 'ts', 'tsx'],
  testRegex: '\\.int-spec\\.ts$',
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    // better-auth and its dependencies ship ES modules only. Node 24 loads them
    // fine in the real app, but Jest's CommonJS runtime can't, so convert them.
    '^.+\\.[cm]?js$': [
      'babel-jest',
      {
        babelrc: false,
        configFile: false,
        plugins: [
          '@babel/plugin-transform-modules-commonjs',
          '@babel/plugin-transform-dynamic-import',
        ],
      },
    ],
  },
  transformIgnorePatterns: [],
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@test/(.*)$': '<rootDir>/test/$1',
  },
  globalSetup: '<rootDir>/test/integration/global-setup.ts',
  setupFiles: ['<rootDir>/test/integration/env.ts'],
  // All test files share one database and wipe it between tests, so they
  // must not run at the same time.
  maxWorkers: 1,
  testTimeout: 30000,
};

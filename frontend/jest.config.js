const { createCjsPreset } = require('jest-preset-angular/presets');

/** @type {import('jest').Config} */
module.exports = {
  ...createCjsPreset(),
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testMatch: ['**/src/**/*.spec.ts'],
  collectCoverageFrom: [
    'src/app/features/staffing-forecast/week.utils.ts',
    'src/app/features/staffing-forecast/staffing-status.utils.ts',
    'src/app/features/staffing-forecast/data-access/**/*.ts',
    'src/app/features/staffing-forecast/components/**/*.ts',
    '!src/app/**/*.spec.ts',
  ],
  coverageThreshold: {
    global: {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
  },
};

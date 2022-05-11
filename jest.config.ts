/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: './test',
  globals: {
    'ts-jest': {
      tsconfig: './tsconfig.json',
    },
  },
};

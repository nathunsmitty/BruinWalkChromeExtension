module.exports = {
  ignorePatterns: ['jquery.js', 'node_modules/'],
  env: {
    browser: true,
    es6: true,
    webextensions: true,
    jquery: true,
  },
  extends: ['eslint:recommended', 'prettier'],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parserOptions: {
    ecmaVersion: 2018,
  },
}

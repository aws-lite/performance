const arc = require('@architect/eslint-config')

module.exports = [
  ...arc,
  {
    ignores: [
      '**/*-bundle.js',
    ],
  },
]

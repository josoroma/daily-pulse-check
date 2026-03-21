export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'setup',
        'auth',
        'portfolio',
        'market',
        'dca',
        'alerts',
        'insights',
        'bitcoin',
        'analytics',
        'settings',
      ],
    ],
  },
}

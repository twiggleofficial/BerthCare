module.exports = {
  displayName: 'backend',
  preset: '../../jest.preset.cjs',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../coverage/apps/backend',
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 70,
      functions: 80,
      lines: 80,
    },
    'src/cache/redis.ts': {
      statements: 95,
      branches: 85,
      functions: 100,
      lines: 95,
    },
    'src/photos/routes.ts': {
      statements: 95,
      branches: 85,
      functions: 100,
      lines: 95,
    },
  },
};

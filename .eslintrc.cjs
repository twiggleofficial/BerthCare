module.exports = {
  root: true,
  ignorePatterns: ['dist', 'node_modules'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: [
      './tsconfig.base.json',
      './apps/backend/tsconfig.json',
      './apps/mobile/tsconfig.json',
      './libs/shared/tsconfig.json',
      './libs/utils/tsconfig.json'
    ],
    tsconfigRootDir: __dirname,
    sourceType: 'module',
    ecmaVersion: 2022
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier'
  ],
  settings: {
    react: {
      version: 'detect'
    }
  },
  overrides: [
    {
      files: ['apps/backend/**/*.{ts,tsx}'],
      env: {
        node: true
      }
    },
    {
      files: ['apps/mobile/**/*.{ts,tsx}'],
      env: {
        browser: true
      },
      rules: {
        '@typescript-eslint/no-unsafe-assignment': 'off'
      }
    }
  ],
  rules: {
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/no-floating-promises': [
      'error',
      { ignoreVoid: true }
    ],
    '@typescript-eslint/no-misused-promises': [
      'error',
      { checksVoidReturn: false }
    ],
    'react/react-in-jsx-scope': 'off',
    'react/jsx-uses-react': 'off'
  }
};

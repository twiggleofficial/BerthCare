module.exports = {
  root: true,
  env: {
    es2022: true,
    node: true,
    jest: true
  },
  plugins: ['@nx', '@typescript-eslint'],
  extends: ['plugin:@nx/typescript', 'plugin:@typescript-eslint/recommended', 'prettier'],
  ignorePatterns: ['dist/', 'node_modules/', 'tmp/', 'coverage/'],
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'warn'
      }
    }
  ]
};

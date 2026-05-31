import nextConfig from 'eslint-config-next'

// nextConfig[1] is the TypeScript config object — reuse its plugin reference
// so our extra rules land in scope of the same @typescript-eslint plugin instance.
const tsPlugin = nextConfig[1]?.plugins?.['@typescript-eslint']

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...nextConfig,
  {
    ...(tsPlugin ? { plugins: { '@typescript-eslint': tsPlugin } } : {}),
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    // Test files: relax rules that are noisy in test code
    files: ['tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
]

export default config

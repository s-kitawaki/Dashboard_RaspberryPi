import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import vue from 'eslint-plugin-vue';

export default tseslint.config(
  {
    ignores: [
      'node_modules/**', 'dist/**', 'storybook-static/**', '.wrangler/**',
      'test-results/**', 'playwright-report/**', 'coverage/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // Essential Vue rules detect invalid templates without enforcing formatting.
  ...vue.configs['flat/essential'],
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    rules: { '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }] },
  },
  {
    files: ['**/*.vue'],
    languageOptions: { parserOptions: { parser: tseslint.parser, extraFileExtensions: ['.vue'] } },
  },
);

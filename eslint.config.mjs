import { FlatCompat } from '@eslint/eslintrc';
import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tseslintParser from '@typescript-eslint/parser';
import prettierPlugin from 'eslint-plugin-prettier';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import simpleImportSortPlugin from 'eslint-plugin-simple-import-sort';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: eslint.configs.recommended,
});

export default [
  ...compat.extends('plugin:@typescript-eslint/recommended'),
  ...compat.extends('plugin:react-hooks/recommended'),
  ...compat.extends('plugin:jsx-a11y/recommended'),
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tseslintParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      'react-hooks': reactHooksPlugin,
      'prettier': prettierPlugin,
      '@typescript-eslint': tseslint,
      'simple-import-sort': simpleImportSortPlugin,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
      'prettier/prettier': ['error', {}, { 'usePrettierrc': true }],
      'linebreak-style': ['error', 'unix'],
      'semi': ['error', 'always'],
      '@typescript-eslint/no-non-null-assertion': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error'
    },
  },
];

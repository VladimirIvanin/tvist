// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  // Базовые рекомендованные правила ESLint
  eslint.configs.recommended,
  
  // Рекомендованные правила TypeScript с проверкой типов
  ...tseslint.configs.recommendedTypeChecked,
  
  // Стилистические правила TypeScript
  ...tseslint.configs.stylisticTypeChecked,
  
  // Глобальные настройки для TypeScript файлов
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2020,
        ...globals.node,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Отключаем необходимость явных типов возврата функций
      '@typescript-eslint/explicit-function-return-type': 'off',
      
      // Предупреждение при использовании any
      '@typescript-eslint/no-explicit-any': 'warn',
      
      // Ошибка при неиспользуемых переменных (кроме начинающихся с _)
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      
      // Предупреждение при использовании non-null assertion
      '@typescript-eslint/no-non-null-assertion': 'warn',
      
      // Разрешаем console.warn и console.error
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      
      // Предпочитаем const
      'prefer-const': 'error',
      
      // Запрещаем var
      'no-var': 'error',
      
      // Смягчаем правила для стилистики - делаем предупреждениями вместо ошибок
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'warn',
      
      // Разрешаем unsafe операции с any - это EventEmitter паттерн
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'warn',
    },
  },
  
  // Настройки для тестовых файлов
  {
    files: ['tests/**/*.ts', '**/*.test.ts', '**/*.spec.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // В тестах разрешаем использовать any и console
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },
  
  // Игнорируемые файлы и директории
  {
    ignores: [
      'dist/',
      'node_modules/',
      '*.config.ts',
      '*.config.js',
      'coverage/',
      '.vite/',
    ],
  }
);


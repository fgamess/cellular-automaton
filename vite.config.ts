import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  test: {
    include: ['domain/**/*.test.ts', 'application/**/*.test.ts', 'adapters/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['domain/**/*.ts', 'application/**/*.ts', 'adapters/**/*.ts'],
      exclude: [
        'domain/**/*.test.ts',
        'application/**/*.test.ts',
        'adapters/**/*.test.ts',
        'adapters/browser/main.ts',
        'adapters/cli/life.ts',
      ],
    },
  },
});

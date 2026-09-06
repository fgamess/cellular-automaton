import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  test: {
    include: ['domain/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['domain/**/*.ts'],
      exclude: ['domain/**/*.test.ts'],
    },
  },
});

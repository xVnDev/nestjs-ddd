import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: {
        statements: 100,
        branches: 80,
        functions: 100,
        lines: 100,
      },
    },
  },
});

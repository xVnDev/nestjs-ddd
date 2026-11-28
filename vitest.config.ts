import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['test/architecture/**', 'src/**/*.spec.ts', 'src/**/*.e2e-spec.ts', 'src/modules/user/interfaces/dto/list-users.query.dto.ts'],
      thresholds: {
        statements: 100,
        branches: 80,
        functions: 100,
        lines: 100,
      },
    },
  },
});

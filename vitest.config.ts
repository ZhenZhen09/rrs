import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'node',
    include: [
      'tests/unit/**/*.test.{ts,tsx}',
      'src/**/__tests__/*.test.{ts,tsx}',
      'server/**/__tests__/*.test.ts',
      'server/routes/*.test.ts',
    ],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});

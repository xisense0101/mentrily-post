import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths({ root: '../../../' })],
  test: {
    globals: true,
    environment: 'node',
    exclude: ['node_modules', 'dist', '**/*.integration.spec.ts', '**/*.e2e.spec.ts'],
    passWithNoTests: true,
  },
});

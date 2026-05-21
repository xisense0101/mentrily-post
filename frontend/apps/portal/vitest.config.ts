import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/test/**/*.spec.ts', 'src/test/**/*.spec.tsx', 'src/modules/**/*.spec.ts', 'src/modules/**/*.spec.tsx'],
    testTimeout: 15000,
  },
});

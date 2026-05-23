import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, '../../../.env.test') });

export default defineConfig({
  plugins: [tsconfigPaths({ root: '../../../' })],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.integration.spec.ts', 'src/**/*.e2e.spec.ts'],
    exclude: ['node_modules', 'dist'],
    pool: 'forks',
    maxWorkers: 1,
    minWorkers: 1,
    fileParallelism: false,
    isolate: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    passWithNoTests: true,
    alias: {
      '@mentrily/data-platform': path.resolve(
        __dirname,
        '../../packages/data-platform/src/index.ts',
      ),
    },
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
});

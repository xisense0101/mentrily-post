import { defineConfig } from '@playwright/test';

const baseURL = process.env.NEXT_PUBLIC_PORTAL_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  retries: 0,
  timeout: 90_000,
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  webServer: {
    command:
      'NEXT_PUBLIC_PLATFORM_API_URL=http://localhost:3001 NEXT_PUBLIC_E2E_TEST_MODE=true PLATFORM_API_URL=http://localhost:3001 pnpm exec next dev -p 3000',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});

import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'backend/packages/*/vitest.integration.config.ts',
  'backend/applications/*/vitest.integration.config.ts',
]);

import { afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanupMountedContainers } from '@/testing';

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);

afterEach(async () => {
  await cleanupMountedContainers();
  document.body.innerHTML = '';
});

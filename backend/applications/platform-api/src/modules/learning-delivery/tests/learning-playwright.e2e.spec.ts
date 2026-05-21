import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn } from 'child_process';
import type { ChildProcess } from 'child_process';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createLearningApiTestApp } from './learning-api-test-app.js';

describe('Learning Delivery Playwright Harness', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createLearningApiTestApp();
    await app.listen(3001, '0.0.0.0');
  }, 60_000);

  afterAll(async () => {
    await app.close();
  });

  it('runs the portal learning E2E suite against the real backend', async () => {
    const result = await runCommand('pnpm', ['--filter', '@mentrily/portal', 'e2e:learning'], {
      NEXT_PUBLIC_PLATFORM_API_URL: 'http://localhost:3001',
      NEXT_PUBLIC_E2E_TEST_MODE: 'true',
      PLATFORM_API_URL: 'http://localhost:3001',
    });

    expect(result.exitCode).toBe(0);
  }, 180_000);
});

function runCommand(
  command: string,
  args: string[],
  env: Record<string, string>,
): Promise<{ exitCode: number | null; signal: NodeJS.Signals | null }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: 'inherit',
      env: {
        ...process.env,
        ...env,
      },
    });

    attachSignalHandlers(child);
    child.on('error', reject);
    child.on('exit', (exitCode, signal) => resolve({ exitCode, signal }));
  });
}

function attachSignalHandlers(child: ChildProcess): void {
  const terminate = () => {
    if (child.exitCode === null && !child.killed) {
      child.kill('SIGTERM');
    }
  };

  process.once('SIGINT', terminate);
  process.once('SIGTERM', terminate);
}

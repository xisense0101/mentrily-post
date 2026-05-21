import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn } from 'child_process';
import type { ChildProcess } from 'child_process';
import { Test } from '@nestjs/testing';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import {
  ENTITLEMENT_EVALUATOR,
  PERMISSION_EVALUATOR,
  TRANSACTION_RUNNER,
  type EntitlementEvaluator,
  type PermissionEvaluator,
  type TransactionRunner,
} from '@mentrily/service-core';
import { PrismaService } from '@mentrily/data-platform';
import { AppModule } from '../../app.module.js';
import { registerCorrelationIdHook } from '../../../foundation/correlation-id.hook.js';

describe('Assessment Attempt Playwright Harness', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const permissionEvaluator: PermissionEvaluator = {
      evaluate: async () => ({ allowed: true }),
    };
    const entitlementEvaluator: EntitlementEvaluator = {
      evaluate: async () => ({ enabled: true }),
    };

    let prismaRef: PrismaService | undefined;
    const transactionRunner: TransactionRunner = {
      run: async <T>(operation: Parameters<TransactionRunner['run']>[0]): Promise<T> => {
        if (!prismaRef) {
          throw new Error('prismaRef not initialized in assessment attempt API test app');
        }

        return prismaRef.$transaction(async (tx) =>
          operation({ transactionId: 'tx-assessment-attempt-api-test', client: tx }),
        ) as Promise<T>;
      },
    };

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PERMISSION_EVALUATOR)
      .useValue(permissionEvaluator)
      .overrideProvider(ENTITLEMENT_EVALUATOR)
      .useValue(entitlementEvaluator)
      .overrideProvider(TRANSACTION_RUNNER)
      .useValue(transactionRunner)
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter(), {
      rawBody: true,
    });
    app.enableCors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    });
    registerCorrelationIdHook(app.getHttpAdapter().getInstance());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    prismaRef = app.get(PrismaService);
    await app.listen(3001, '0.0.0.0');
  }, 60_000);

  afterAll(async () => {
    await app.close();
  });

  it('runs the portal assessment attempt E2E suite against the real backend', async () => {
    const result = await runCommand(
      'pnpm',
      ['--filter', '@mentrily/portal', 'e2e:assessment-attempt'],
      {
        NEXT_PUBLIC_PLATFORM_API_URL: 'http://localhost:3001',
        NEXT_PUBLIC_E2E_TEST_MODE: 'true',
        PLATFORM_API_URL: 'http://localhost:3001',
      },
    );

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

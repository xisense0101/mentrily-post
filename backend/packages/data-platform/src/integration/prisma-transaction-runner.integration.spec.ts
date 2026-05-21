import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { PrismaTransactionRunner } from '../transactions/prisma-transaction-runner.js';
import { getPrismaClient } from '../transactions/transaction-client.js';
import { truncatePublicSchema } from '@mentrily/testing-toolkit';

describe('PrismaTransactionRunner (Integration)', () => {
  let prisma: PrismaClient;
  let runner: PrismaTransactionRunner;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
    runner = new PrismaTransactionRunner(prisma as any);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await truncatePublicSchema(prisma);
  });

  it('should commit changes when the operation succeeds', async () => {
    const principalId = randomUUID();
    
    await runner.run(async (tx) => {
      const txClient = getPrismaClient(prisma as any, tx);
      await txClient.principal.create({
        data: {
          id: principalId,
          email: `${principalId}@example.com`,
        },
      });
    });

    const saved = await prisma.principal.findUnique({
      where: { id: principalId },
    });
    expect(saved).toBeDefined();
    expect(saved?.id).toBe(principalId);
  });

  it('should rollback changes when the operation fails', async () => {
    const principalId = randomUUID();
    
    try {
      await runner.run(async (tx) => {
        const txClient = getPrismaClient(prisma as any, tx);
        await txClient.principal.create({
          data: {
            id: principalId,
            email: `${principalId}@example.com`,
          },
        });
        throw new Error('Forced rollback');
      });
    } catch (error) {
      expect((error as Error).message).toBe('Forced rollback');
    }

    const saved = await prisma.principal.findUnique({
      where: { id: principalId },
    });
    expect(saved).toBeNull();
  });
});

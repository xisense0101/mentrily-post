import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrismaTransactionRunner } from '../prisma-transaction-runner.js';
import type { PrismaService } from '../../prisma.service.js';

describe('PrismaTransactionRunner', () => {
  let prisma: any;
  let runner: PrismaTransactionRunner;

  beforeEach(() => {
    prisma = {
      $transaction: vi.fn((fn) => fn('mock-tx-client')),
    };
    runner = new PrismaTransactionRunner(prisma as unknown as PrismaService);
  });

  it('calls prisma.$transaction and provides context', async () => {
    const result = await runner.run(async (tx) => {
      expect(tx.transactionId).toBeDefined();
      expect(typeof tx.transactionId).toBe('string');
      expect(tx.client).toBe('mock-tx-client');
      return 'success';
    });

    expect(result).toBe('success');
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('generates unique transaction IDs', async () => {
    let id1: string = '';
    let id2: string = '';

    await runner.run(async (tx) => { id1 = tx.transactionId; });
    await runner.run(async (tx) => { id2 = tx.transactionId; });

    expect(id1).not.toBe(id2);
  });
});

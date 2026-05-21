import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { TransactionRunner, TransactionContext } from '@mentrily/service-core';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class PrismaTransactionRunner implements TransactionRunner {
  constructor(private readonly prisma: PrismaService) {}

  async run<T>(operation: (transaction: TransactionContext) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      const transactionId = randomUUID();
      const context: TransactionContext = {
        transactionId,
        client: tx,
      };

      return operation(context);
    });
  }
}

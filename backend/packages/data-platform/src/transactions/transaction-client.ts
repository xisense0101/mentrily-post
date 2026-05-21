import { Prisma } from '@prisma/client';
import type { TransactionContext } from '@mentrily/service-core';
import type { PrismaService } from '../prisma.service.js';

/**
 * Extracts the Prisma transaction client from a generic TransactionContext.
 * If no transaction is provided, returns the default PrismaService.
 */
export function getPrismaClient(
  prisma: PrismaService,
  transaction?: TransactionContext,
): PrismaService | Prisma.TransactionClient {
  if (transaction?.client) {
    return transaction.client as Prisma.TransactionClient;
  }
  return prisma;
}

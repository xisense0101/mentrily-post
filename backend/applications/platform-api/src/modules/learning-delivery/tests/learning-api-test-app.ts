import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
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

export async function createLearningApiTestApp(): Promise<NestFastifyApplication> {
  const permissionEvaluator: PermissionEvaluator = { evaluate: async () => ({ allowed: true }) };
  const entitlementEvaluator: EntitlementEvaluator = { evaluate: async () => ({ enabled: true }) };

  let prismaRef: PrismaService | undefined;
  const transactionRunner: TransactionRunner = {
    run: async <T>(operation: Parameters<TransactionRunner['run']>[0]): Promise<T> => {
      if (!prismaRef) throw new Error('prismaRef not initialized in learning API test app');
      return prismaRef.$transaction(async (tx) =>
        operation({ transactionId: 'tx-learning-api-test', client: tx }),
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

  const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter(), {
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
  return app;
}

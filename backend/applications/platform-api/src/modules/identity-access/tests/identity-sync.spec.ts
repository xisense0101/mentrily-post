import { describe, it, expect, beforeEach } from 'vitest';
import { SyncExternalPrincipal } from '../application/use-cases/sync-external-principal.use-case.js';
import { createPrismaMock } from './prisma-mock.js';
import { PrismaPrincipalRepository } from '../infrastructure/persistence/prisma/prisma-principal.repository.js';
import { PrismaExternalIdentityRepository } from '../infrastructure/persistence/prisma/prisma-external-identity.repository.js';
import { ExternalProvider } from '../domain/index.js';

describe('SyncExternalPrincipal', () => {
  let useCase: SyncExternalPrincipal;
  let principalRepo: PrismaPrincipalRepository;
  let externalIdentityRepo: PrismaExternalIdentityRepository;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    principalRepo = new PrismaPrincipalRepository(prismaMock as any);
    externalIdentityRepo = new PrismaExternalIdentityRepository(prismaMock as any);
    useCase = new SyncExternalPrincipal(principalRepo, externalIdentityRepo);
  });

  it('should create a new principal and link external identity if none exists', async () => {
    prismaMock.externalIdentity.findUnique.mockResolvedValue(null);
    prismaMock.principal.findUnique.mockResolvedValue(null);

    const dto = {
      externalId: 'clerk-123',
      email: 'test@example.com',
      displayName: 'Test User',
    };

    const principalId = await useCase.execute(dto);

    expect(principalId).toBeDefined();
    expect(prismaMock.principal.upsert).toHaveBeenCalled();
    expect(prismaMock.externalIdentity.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          externalId: 'clerk-123',
          provider: ExternalProvider.CLERK,
        }),
      }),
    );
  });

  it('should return existing principal id if external identity already exists', async () => {
    const existingIdentity = {
      id: 'uuid-id',
      principalId: 'principal-uuid',
      provider: 'CLERK',
      externalId: 'clerk-123',
    };

    prismaMock.externalIdentity.findUnique.mockResolvedValue(existingIdentity);
    prismaMock.principal.findUnique.mockResolvedValue({ id: 'principal-uuid' });

    const dto = {
      externalId: 'clerk-123',
      email: 'test@example.com',
    };

    const principalId = await useCase.execute(dto);

    expect(principalId).toBe('principal-uuid');
    expect(prismaMock.principal.upsert).not.toHaveBeenCalled();
  });

  it('should link to existing principal if email matches but identity is new', async () => {
    prismaMock.externalIdentity.findUnique.mockResolvedValue(null);
    prismaMock.principal.findUnique.mockResolvedValue({
      id: 'existing-principal-uuid',
      email: 'test@example.com',
    });

    const dto = {
      externalId: 'clerk-123',
      email: 'test@example.com',
    };

    const principalId = await useCase.execute(dto);

    expect(principalId).toBe('existing-principal-uuid');
    expect(prismaMock.externalIdentity.upsert).toHaveBeenCalled();
  });
});

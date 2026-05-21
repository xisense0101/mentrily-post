import { describe, it, expect, beforeEach } from 'vitest';
import { PrismaPrincipalRepository } from '../infrastructure/persistence/prisma/prisma-principal.repository.js';
import { createPrismaMock } from './prisma-mock.js';
import { PrincipalStatus } from '../domain/index.js';

describe('PrismaPrincipalRepository', () => {
  let repository: PrismaPrincipalRepository;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prismaMock: Record<string, any>;

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prismaMock = createPrismaMock() as unknown as Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repository = new PrismaPrincipalRepository(prismaMock as any);
  });

  it('should find a principal by id', async () => {
    const mockPrincipal = {
      id: 'uuid-1',
      email: 'test@example.com',
      displayName: 'Test User',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    prismaMock.principal.findUnique.mockResolvedValue(mockPrincipal);

    const result = await repository.findById('uuid-1');

    expect(result).toBeDefined();
    expect(result?.id).toBe('uuid-1');
    expect(result?.email).toBe('test@example.com');
    expect(prismaMock.principal.findUnique).toHaveBeenCalledWith({
      where: { id: 'uuid-1', deletedAt: null },
    });
  });

  it('should return null if principal not found', async () => {
    prismaMock.principal.findUnique.mockResolvedValue(null);

    const result = await repository.findById('non-existent');

    expect(result).toBeNull();
  });

  it('should save a principal', async () => {
    const principal = {
      id: 'uuid-1',
      email: 'test@example.com',
      displayName: 'Test User',
      status: PrincipalStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await repository.save(principal);

    expect(prismaMock.principal.upsert).toHaveBeenCalledWith({
      where: { id: 'uuid-1' },
      update: {
        email: 'test@example.com',
        displayName: 'Test User',
        status: 'ACTIVE',
      },
      create: {
        id: 'uuid-1',
        email: 'test@example.com',
        displayName: 'Test User',
        status: 'ACTIVE',
      },
    });
  });
});

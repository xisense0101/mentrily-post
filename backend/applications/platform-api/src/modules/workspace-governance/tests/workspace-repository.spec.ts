import { describe, it, expect, beforeEach } from 'vitest';
import { PrismaWorkspaceRepository } from '../infrastructure/persistence/prisma/prisma-workspace.repository.js';
import { createPrismaMock } from '../../identity-access/tests/prisma-mock.js';
import { WorkspaceStatus, WorkspaceSlug } from '../domain/index.js';

describe('PrismaWorkspaceRepository', () => {
  let repository: PrismaWorkspaceRepository;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prismaMock: Record<string, any>;

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prismaMock = createPrismaMock() as unknown as Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repository = new PrismaWorkspaceRepository(prismaMock as any);
  });

  it('should find a workspace by slug', async () => {
    const mockWorkspace = {
      id: 'uuid-1',
      name: 'Test Workspace',
      slug: 'test-ws',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    prismaMock.workspace.findUnique.mockResolvedValue(mockWorkspace);

    const result = await repository.findBySlug(new WorkspaceSlug('test-ws'));

    expect(result).toBeDefined();
    expect(result?.slug.toString()).toBe('test-ws');
    expect(prismaMock.workspace.findUnique).toHaveBeenCalledWith({
      where: { slug: 'test-ws', deletedAt: null },
    });
  });

  it('should save a workspace', async () => {
    const workspace = {
      id: 'uuid-1',
      name: 'Test Workspace',
      slug: new WorkspaceSlug('test-ws'),
      status: WorkspaceStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await repository.save(workspace);

    expect(prismaMock.workspace.upsert).toHaveBeenCalledWith({
      where: { id: 'uuid-1' },
      update: {
        name: 'Test Workspace',
        slug: 'test-ws',
        status: 'ACTIVE',
      },
      create: {
        id: 'uuid-1',
        name: 'Test Workspace',
        slug: 'test-ws',
        status: 'ACTIVE',
      },
    });
  });
});

import { vi } from 'vitest';

export const createPrismaMock = () => ({
  principal: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  },
  externalIdentity: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  accessSession: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  },
  invitation: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    upsert: vi.fn(),
  },
  serviceCredential: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  workspace: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  workspaceMember: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  },
  workspaceMemberRole: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  },
  workspaceRole: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  },
  workspacePermission: {
    findMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  },
  team: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  },
  workspaceDomain: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
  workspaceBranding: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  $transaction: vi.fn((fn) => fn(createPrismaMock())),
});

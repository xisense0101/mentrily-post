import { describe, expect, it } from 'vitest';
import { MediaAsset } from '../domain/entities/index.js';

function buildAsset() {
  return MediaAsset.createPending({
    id: 'a1',
    tenantId: 't1',
    workspaceId: 'w1',
    ownerPrincipalId: 'p1',
    filename: 'file.pdf',
    contentType: 'application/pdf',
    fileCategory: 'DOCUMENT',
    storageProvider: 'FIXTURE',
    objectKey: 'tenants/t1/workspaces/w1/media/a1/file.pdf',
  });
}

describe('MediaAsset domain', () => {
  it('creates pending media asset', () => {
    expect(buildAsset().status).toBe('PENDING_UPLOAD');
  });

  it('marks pending asset available', () => {
    expect(buildAsset().markAvailable({ sizeBytes: 128 }).status).toBe('AVAILABLE');
  });

  it('archives available asset', () => {
    const archived = buildAsset().markAvailable({}).archive();
    expect(archived.status).toBe('ARCHIVED');
    expect(archived.archivedAt).toBeDefined();
  });

  it('archived asset cannot be read', () => {
    const archived = buildAsset().markAvailable({}).archive();
    expect(archived.canBeReadBy({ tenantId: 't1', workspaceId: 'w1', actorId: 'p1' })).toBe(false);
  });
});

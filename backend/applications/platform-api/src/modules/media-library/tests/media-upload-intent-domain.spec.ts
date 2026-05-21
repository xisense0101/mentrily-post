import { describe, expect, it } from 'vitest';
import { MediaUploadIntent } from '../domain/entities/index.js';

function buildIntent() {
  return MediaUploadIntent.create({
    id: 'u1',
    tenantId: 't1',
    workspaceId: 'w1',
    assetId: 'a1',
    ownerPrincipalId: 'p1',
    objectKey: 'tenants/t1/workspaces/w1/media/a1/file.pdf',
    contentType: 'application/pdf',
    filename: 'file.pdf',
    fileCategory: 'DOCUMENT',
    maxSizeBytes: 1024,
    uploadUrl: 'https://fixture/upload',
    uploadMethod: 'PUT',
    headers: {},
    expiresAt: new Date(Date.now() + 1000),
  });
}

describe('MediaUploadIntent domain', () => {
  it('creates upload intent', () => {
    expect(buildIntent().status).toBe('PENDING');
  });

  it('detects expiry', () => {
    const intent = buildIntent();
    expect(intent.isExpired(new Date(intent.expiresAt.getTime() + 1))).toBe(true);
  });
});

import type { MediaAssetContract } from '@mentrily/domain-contracts';

describe('portal contract import boundary', () => {
  it('accepts MediaAssetContract imports from @mentrily/domain-contracts', () => {
    const asset: MediaAssetContract = {
      id: 'asset_123',
      ownerPrincipalId: 'principal_123',
      filename: 'example.png',
      contentType: 'image/png',
      fileCategory: 'IMAGE',
      sizeBytes: 1024,
      checksumSha256: 'abc123',
      storageProvider: 'FIXTURE',
      objectKey: 'media/example.png',
      visibility: 'PRIVATE',
      status: 'AVAILABLE',
      metadata: {},
      createdAt: '2026-05-21T00:00:00.000Z',
      updatedAt: '2026-05-21T00:00:00.000Z',
    };

    expect(asset.filename).toBe('example.png');
  });
});

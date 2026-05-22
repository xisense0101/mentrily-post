import type {
  MediaAssetContract,
  NotificationPreferenceContract,
} from '@mentrily/domain-contracts';

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

  it('accepts NotificationPreferenceContract imports from @mentrily/domain-contracts', () => {
    const preference: NotificationPreferenceContract = {
      id: 'pref_123',
      channel: 'IN_APP',
      category: 'SYSTEM',
      enabled: true,
      createdAt: '2026-05-22T00:00:00.000Z',
      updatedAt: '2026-05-22T00:00:00.000Z',
    };

    expect(preference.category).toBe('SYSTEM');
  });
});

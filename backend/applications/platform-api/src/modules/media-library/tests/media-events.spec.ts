import { describe, expect, it } from 'vitest';
import { mediaAssetCreated } from '../domain/events/index.js';

describe('Media events', () => {
  it('event factories include tenant/workspace', () => {
    const event = mediaAssetCreated({
      tenantId: 't1',
      workspaceId: 'w1',
      assetId: 'a1',
      objectKey: 'tenants/t1/workspaces/w1/media/a1/file.pdf',
      contentType: 'application/pdf',
      fileCategory: 'DOCUMENT',
    });

    expect(event.eventVersion).toBe(1);
    expect(event.tenantId).toBe('t1');
    expect(event.workspaceId).toBe('w1');
  });
});

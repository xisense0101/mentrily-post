import { describe, expect, it } from 'vitest';
import { MediaUploadPolicyService } from '../domain/services/index.js';

describe('Media policies', () => {
  const service = new MediaUploadPolicyService();

  it('rejects invalid content type', () => {
    expect(() => service.validateContentType('png')).toThrow();
  });

  it('rejects invalid filename', () => {
    expect(() => service.validateFilename('../secret.pdf')).toThrow();
  });

  it('enforces size limit', () => {
    expect(() => service.validateMaxSize('IMAGE', 11 * 1024 * 1024)).toThrow();
  });
});

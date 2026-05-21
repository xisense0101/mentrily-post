import { createHash } from 'node:crypto';
import type { ObjectStoragePort } from './object-storage.port.js';
import type {
  CreateObjectReadUrlInput,
  CreateObjectUploadUrlInput,
  DeleteObjectInput,
  ObjectReadUrlResult,
  ObjectUploadUrlResult,
} from './object-storage.types.js';

function signatureFor(parts: string[]): string {
  return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 32);
}

export class FixtureObjectStorageAdapter implements ObjectStoragePort {
  async createUploadUrl(input: CreateObjectUploadUrlInput): Promise<ObjectUploadUrlResult> {
    const signature = signatureFor([
      'upload',
      input.provider,
      input.objectKey,
      input.contentType,
      input.expiresAt.toISOString(),
    ]);

    return {
      provider: input.provider,
      url: `https://fixture-object-storage.local/upload/${encodeURIComponent(input.objectKey)}?sig=${signature}`,
      method: 'PUT',
      headers: {
        'content-type': input.contentType,
        'x-fixture-signature': signature,
      },
      expiresAt: input.expiresAt,
    };
  }

  async createReadUrl(input: CreateObjectReadUrlInput): Promise<ObjectReadUrlResult> {
    const signature = signatureFor([
      'read',
      input.provider,
      input.objectKey,
      input.expiresAt.toISOString(),
      input.filename ?? '',
    ]);

    return {
      provider: input.provider,
      url: `https://fixture-object-storage.local/read/${encodeURIComponent(input.objectKey)}?sig=${signature}`,
      method: 'GET',
      headers: {
        'x-fixture-signature': signature,
      },
      expiresAt: input.expiresAt,
    };
  }

  async deleteObject(_input: DeleteObjectInput): Promise<void> {}
}

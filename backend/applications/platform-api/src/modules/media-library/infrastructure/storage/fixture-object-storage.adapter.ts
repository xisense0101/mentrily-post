import { createHash } from 'node:crypto';

export interface CreateObjectUploadUrlInput {
  provider: 'FIXTURE' | 'S3_COMPATIBLE_RESERVED';
  objectKey: string;
  contentType: string;
  expiresAt: Date;
  method: 'PUT';
}

export interface ObjectUploadUrlResult {
  provider: 'FIXTURE' | 'S3_COMPATIBLE_RESERVED';
  url: string;
  method: 'PUT';
  headers: Record<string, string>;
  expiresAt: Date;
}

export interface CreateObjectReadUrlInput {
  provider: 'FIXTURE' | 'S3_COMPATIBLE_RESERVED';
  objectKey: string;
  expiresAt: Date;
  filename?: string | undefined;
}

export interface ObjectReadUrlResult {
  provider: 'FIXTURE' | 'S3_COMPATIBLE_RESERVED';
  url: string;
  method: 'GET';
  headers: Record<string, string>;
  expiresAt: Date;
}

export interface DeleteObjectInput {
  provider: 'FIXTURE' | 'S3_COMPATIBLE_RESERVED';
  objectKey: string;
}

export interface ObjectStoragePort {
  createUploadUrl(input: CreateObjectUploadUrlInput): Promise<ObjectUploadUrlResult>;
  createReadUrl(input: CreateObjectReadUrlInput): Promise<ObjectReadUrlResult>;
  deleteObject(input: DeleteObjectInput): Promise<void>;
}

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

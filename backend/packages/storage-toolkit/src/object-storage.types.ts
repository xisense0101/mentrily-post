export interface CreateObjectUploadUrlInput {
  provider: 'FIXTURE' | 'S3_COMPATIBLE_RESERVED';
  objectKey: string;
  contentType: string;
  expiresAt: Date;
  method: 'PUT';
  metadata?: Record<string, string> | undefined;
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

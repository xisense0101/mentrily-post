import { AppError } from '@mentrily/service-core';
import type {
  CreateObjectReadUrlInput,
  CreateObjectUploadUrlInput,
  DeleteObjectInput,
  ObjectReadUrlResult,
  ObjectStoragePort,
  ObjectUploadUrlResult,
} from './fixture-object-storage.adapter.js';

function unavailable(): never {
  throw new AppError('SERVICE_UNAVAILABLE', 'object storage provider unavailable', 503);
}

export class NoopObjectStorageAdapter implements ObjectStoragePort {
  async createUploadUrl(_input: CreateObjectUploadUrlInput): Promise<ObjectUploadUrlResult> {
    unavailable();
  }

  async createReadUrl(_input: CreateObjectReadUrlInput): Promise<ObjectReadUrlResult> {
    unavailable();
  }

  async deleteObject(_input: DeleteObjectInput): Promise<void> {
    unavailable();
  }
}

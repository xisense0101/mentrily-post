import type {
  CreateObjectReadUrlInput,
  CreateObjectUploadUrlInput,
  DeleteObjectInput,
  ObjectReadUrlResult,
  ObjectUploadUrlResult,
} from './object-storage.types.js';

export interface ObjectStoragePort {
  createUploadUrl(input: CreateObjectUploadUrlInput): Promise<ObjectUploadUrlResult>;
  createReadUrl(input: CreateObjectReadUrlInput): Promise<ObjectReadUrlResult>;
  deleteObject(input: DeleteObjectInput): Promise<void>;
}

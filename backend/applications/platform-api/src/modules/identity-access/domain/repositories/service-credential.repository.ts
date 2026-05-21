import { ServiceCredential } from '../entities/index.js';

export abstract class ServiceCredentialRepository {
  abstract findByKeyId(keyId: string): Promise<ServiceCredential | null>;
  abstract save(credential: ServiceCredential): Promise<void>;
}

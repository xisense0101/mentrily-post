import { ExternalIdentity } from '../entities/index.js';
import { ExternalProvider } from '../value-objects/index.js';

export abstract class ExternalIdentityRepository {
  abstract findByExternalId(
    provider: ExternalProvider,
    externalId: string,
  ): Promise<ExternalIdentity | null>;
  abstract save(identity: ExternalIdentity): Promise<void>;
}

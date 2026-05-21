import { ExternalUserDTO } from '@mentrily/contract-catalog';

export abstract class IdentityProviderPort {
  abstract getUserById(externalId: string): Promise<ExternalUserDTO | null>;
}

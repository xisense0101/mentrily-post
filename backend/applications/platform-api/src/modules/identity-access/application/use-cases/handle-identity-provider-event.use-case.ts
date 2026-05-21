import { Injectable } from '@nestjs/common';
import { IdentityProviderEventDTO } from '@mentrily/contract-catalog';
import { SyncExternalPrincipal } from './sync-external-principal.use-case.js';
import { PrincipalRepository } from '../../domain/repositories/principal.repository.js';
import { ExternalIdentityRepository } from '../../domain/repositories/external-identity.repository.js';
import { ExternalProvider, PrincipalStatus } from '../../domain/index.js';

@Injectable()
export class HandleIdentityProviderEvent {
  constructor(
    private readonly syncExternalPrincipal: SyncExternalPrincipal,
    private readonly principalRepo: PrincipalRepository,
    private readonly externalIdentityRepo: ExternalIdentityRepository,
  ) {}

  async execute(event: IdentityProviderEventDTO): Promise<void> {
    switch (event.type) {
      case 'user.created':
      case 'user.updated':
        if (event.data.email) {
          await this.syncExternalPrincipal.execute({
            externalId: event.externalId,
            email: event.data.email,
            displayName: event.data.displayName,
            metadata: event.data.metadata,
          });
        }
        break;

      case 'user.deleted':
        await this.handleUserDeleted(event.externalId);
        break;

      default:
        console.warn(`Unhandled identity provider event type: ${event.type}`);
    }
  }

  private async handleUserDeleted(externalId: string): Promise<void> {
    const identity = await this.externalIdentityRepo.findByExternalId(
      ExternalProvider.CLERK,
      externalId,
    );

    if (identity) {
      const principal = await this.principalRepo.findById(identity.principalId);
      if (principal) {
        principal.status = PrincipalStatus.DELETED;
        principal.updatedAt = new Date();
        await this.principalRepo.save(principal);
      }
    }
  }
}

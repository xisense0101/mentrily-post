import { Injectable } from '@nestjs/common';
import { PrincipalRepository } from '../../domain/repositories/principal.repository.js';
import { ExternalIdentityRepository } from '../../domain/repositories/external-identity.repository.js';
import { ExternalUserDTO } from '@mentrily/contract-catalog';
import { Principal, PrincipalStatus } from '../../domain/index.js';
import { ExternalProvider } from '../../domain/index.js';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SyncExternalPrincipal {
  constructor(
    private readonly principalRepo: PrincipalRepository,
    private readonly externalIdentityRepo: ExternalIdentityRepository,
  ) {}

  async execute(dto: ExternalUserDTO): Promise<string> {
    // 1. Check if external identity already exists
    const externalIdentity = await this.externalIdentityRepo.findByExternalId(
      ExternalProvider.CLERK,
      dto.externalId,
    );

    if (externalIdentity) {
      // Update existing principal if email changed or just sync
      const principal = await this.principalRepo.findById(externalIdentity.principalId);
      if (principal) {
        // Sync logic if needed
        return principal.id;
      }
    }

    // 2. Check if principal with same email exists
    let principal = await this.principalRepo.findByEmail(dto.email);

    if (!principal) {
      // 3. Create new principal
      const newPrincipal: Principal = {
        id: uuidv4(),
        email: dto.email,
        status: PrincipalStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (dto.displayName) {
        newPrincipal.displayName = dto.displayName;
      }

      principal = newPrincipal;
      await this.principalRepo.save(principal);
    }

    // 4. Link external identity if not already linked
    if (!externalIdentity) {
      const newIdentity: any = {
        id: uuidv4(),
        principalId: principal.id,
        provider: ExternalProvider.CLERK,
        externalId: dto.externalId,
        email: dto.email,
        createdAt: new Date(),
      };

      if (dto.metadata) {
        newIdentity.metadata = dto.metadata;
      }

      await this.externalIdentityRepo.save(newIdentity);
    }

    return principal.id;
  }
}

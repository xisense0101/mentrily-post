import { Injectable } from '@nestjs/common';
import { ExternalIdentityRepository } from '../../domain/repositories/external-identity.repository.js';
import { ExternalProvider } from '../../domain/index.js';
import { v4 as uuidv4 } from 'uuid';

export interface LinkExternalIdentityCommand {
  principalId: string;
  provider: ExternalProvider;
  externalId: string;
  email: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class LinkExternalIdentity {
  constructor(private readonly externalIdentityRepo: ExternalIdentityRepository) {}

  async execute(command: LinkExternalIdentityCommand): Promise<void> {
    const existing = await this.externalIdentityRepo.findByExternalId(
      command.provider,
      command.externalId,
    );

    if (existing) {
      if (existing.principalId !== command.principalId) {
        throw new Error('External identity already linked to another principal');
      }
      return;
    }

    const identity: any = {
      id: uuidv4(),
      principalId: command.principalId,
      provider: command.provider,
      externalId: command.externalId,
      email: command.email,
      createdAt: new Date(),
    };

    if (command.metadata) {
      identity.metadata = command.metadata;
    }

    await this.externalIdentityRepo.save(identity);
  }
}

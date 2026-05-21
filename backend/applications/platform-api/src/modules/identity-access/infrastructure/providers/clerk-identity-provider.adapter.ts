import { Injectable } from '@nestjs/common';
import { createClerkClient } from '@clerk/backend';
import { IdentityProviderPort } from '../../application/ports/identity-provider.port.js';
import { ExternalUserDTO } from '@mentrily/contract-catalog';

@Injectable()
export class ClerkIdentityProviderAdapter implements IdentityProviderPort {
  private client;

  constructor() {
    this.client = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY || '' });
  }

  async getUserById(externalId: string): Promise<ExternalUserDTO | null> {
    try {
      const user = await this.client.users.getUser(externalId);

      return {
        externalId: user.id,
        email: user.emailAddresses[0]?.emailAddress ?? '',
        displayName: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || undefined,
        avatarUrl: user.imageUrl,
        metadata: user.publicMetadata as Record<string, any>,
      };
    } catch (error: any) {
      if (error.status === 404) {
        return null;
      }
      throw error;
    }
  }
}

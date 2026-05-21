import { Module, forwardRef } from '@nestjs/common';
import { DataPlatformModule } from '@mentrily/data-platform';
import { FoundationModule } from '../../foundation/foundation.module.js';
import { WorkspaceGovernanceModule } from '../workspace-governance/workspace-governance.module.js';

import { PrismaPrincipalRepository } from './infrastructure/persistence/prisma/prisma-principal.repository.js';
import { PrismaExternalIdentityRepository } from './infrastructure/persistence/prisma/prisma-external-identity.repository.js';
import { PrismaAccessSessionRepository } from './infrastructure/persistence/prisma/prisma-access-session.repository.js';
import { PrismaInvitationRepository } from './infrastructure/persistence/prisma/prisma-invitation.repository.js';
import { PrismaServiceCredentialRepository } from './infrastructure/persistence/prisma/prisma-service-credential.repository.js';
import { ClerkIdentityProviderAdapter } from './infrastructure/providers/clerk-identity-provider.adapter.js';

import { SyncExternalPrincipal } from './application/use-cases/sync-external-principal.use-case.js';
import { LinkExternalIdentity } from './application/use-cases/link-external-identity.use-case.js';
import { HandleIdentityProviderEvent } from './application/use-cases/handle-identity-provider-event.use-case.js';
import { CreateWorkspaceInvitation } from './application/use-cases/create-workspace-invitation.use-case.js';
import { AcceptWorkspaceInvitation } from './application/use-cases/accept-workspace-invitation.use-case.js';
import { RevokeWorkspaceInvitation } from './application/use-cases/revoke-workspace-invitation.use-case.js';

import { ClerkWebhookController } from './presentation/http/clerk-webhook.controller.js';
import { PrincipalRepository } from './domain/repositories/principal.repository.js';
import { ExternalIdentityRepository } from './domain/repositories/external-identity.repository.js';
import { AccessSessionRepository } from './domain/repositories/access-session.repository.js';
import { InvitationRepository } from './domain/repositories/invitation.repository.js';
import { ServiceCredentialRepository } from './domain/repositories/service-credential.repository.js';
import { IdentityProviderPort } from './application/ports/identity-provider.port.js';

@Module({
  imports: [DataPlatformModule, FoundationModule, forwardRef(() => WorkspaceGovernanceModule)],
  controllers: [ClerkWebhookController],
  providers: [
    // Repositories
    {
      provide: PrincipalRepository,
      useClass: PrismaPrincipalRepository,
    },
    {
      provide: ExternalIdentityRepository,
      useClass: PrismaExternalIdentityRepository,
    },
    {
      provide: AccessSessionRepository,
      useClass: PrismaAccessSessionRepository,
    },
    {
      provide: InvitationRepository,
      useClass: PrismaInvitationRepository,
    },
    {
      provide: ServiceCredentialRepository,
      useClass: PrismaServiceCredentialRepository,
    },
    // Providers
    {
      provide: IdentityProviderPort,
      useClass: ClerkIdentityProviderAdapter,
    },
    // Use Cases
    SyncExternalPrincipal,
    LinkExternalIdentity,
    HandleIdentityProviderEvent,
    CreateWorkspaceInvitation,
    AcceptWorkspaceInvitation,
    RevokeWorkspaceInvitation,
  ],
  exports: [
    PrincipalRepository,
    ExternalIdentityRepository,
    AccessSessionRepository,
    InvitationRepository,
    ServiceCredentialRepository,
    IdentityProviderPort,
    SyncExternalPrincipal,
    LinkExternalIdentity,
    CreateWorkspaceInvitation,
    AcceptWorkspaceInvitation,
    RevokeWorkspaceInvitation,
  ],
})
export class IdentityAccessModule {}

import { Module } from '@nestjs/common';
import { DataPlatformModule } from '@mentrily/data-platform';
import { FoundationModule } from '../../foundation/foundation.module.js';
import { PrismaWorkspaceRepository } from './infrastructure/persistence/prisma/prisma-workspace.repository.js';
import { PrismaWorkspaceMemberRepository } from './infrastructure/persistence/prisma/prisma-workspace-member.repository.js';
import { PrismaWorkspaceRoleRepository } from './infrastructure/persistence/prisma/prisma-workspace-role.repository.js';
import { PrismaWorkspacePermissionRepository } from './infrastructure/persistence/prisma/prisma-workspace-permission.repository.js';
import { PrismaTeamRepository } from './infrastructure/persistence/prisma/prisma-team.repository.js';
import { PrismaWorkspaceDomainRepository } from './infrastructure/persistence/prisma/prisma-workspace-domain.repository.js';
import { PrismaWorkspaceBrandingRepository } from './infrastructure/persistence/prisma/prisma-workspace-branding.repository.js';
import { WorkspaceRepository } from './domain/repositories/workspace.repository.js';
import { WorkspaceMemberRepository } from './domain/repositories/workspace-member.repository.js';
import { WorkspaceRoleRepository } from './domain/repositories/workspace-role.repository.js';
import { WorkspacePermissionRepository } from './domain/repositories/workspace-permission.repository.js';
import { TeamRepository } from './domain/repositories/team.repository.js';
import { WorkspaceDomainRepository } from './domain/repositories/workspace-domain.repository.js';
import { WorkspaceBrandingRepository } from './domain/repositories/workspace-branding.repository.js';

// Use Cases
import { ProvisionWorkspace } from './application/use-cases/provision-workspace.use-case.js';
import { AddWorkspaceMember } from './application/use-cases/add-workspace-member.use-case.js';
import { RemoveWorkspaceMember } from './application/use-cases/remove-workspace-member.use-case.js';
import { AssignWorkspaceRole } from './application/use-cases/assign-workspace-role.use-case.js';
import { PERMISSION_EVALUATOR } from '@mentrily/service-core';
import { WorkspacePermissionEvaluator } from './infrastructure/security/workspace-permission.evaluator.js';

@Module({
  imports: [DataPlatformModule, FoundationModule],
  controllers: [],
  providers: [
    {
      provide: WorkspaceRepository,
      useClass: PrismaWorkspaceRepository,
    },
    {
      provide: WorkspaceMemberRepository,
      useClass: PrismaWorkspaceMemberRepository,
    },
    {
      provide: WorkspaceRoleRepository,
      useClass: PrismaWorkspaceRoleRepository,
    },
    {
      provide: PERMISSION_EVALUATOR,
      useClass: WorkspacePermissionEvaluator,
    },
    {
      provide: WorkspacePermissionRepository,
      useClass: PrismaWorkspacePermissionRepository,
    },
    {
      provide: TeamRepository,
      useClass: PrismaTeamRepository,
    },
    {
      provide: WorkspaceDomainRepository,
      useClass: PrismaWorkspaceDomainRepository,
    },
    {
      provide: WorkspaceBrandingRepository,
      useClass: PrismaWorkspaceBrandingRepository,
    },
    // Use Cases
    ProvisionWorkspace,
    AddWorkspaceMember,
    RemoveWorkspaceMember,
    AssignWorkspaceRole,
  ],
  exports: [
    WorkspaceRepository,
    WorkspaceMemberRepository,
    WorkspaceRoleRepository,
    WorkspacePermissionRepository,
    TeamRepository,
    WorkspaceDomainRepository,
    WorkspaceBrandingRepository,
    // Use Cases
    ProvisionWorkspace,
    AddWorkspaceMember,
    RemoveWorkspaceMember,
    AssignWorkspaceRole,
    PERMISSION_EVALUATOR,
  ],
})
export class WorkspaceGovernanceModule {}

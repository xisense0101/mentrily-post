import { Injectable, Inject } from '@nestjs/common';
import { 
  PermissionEvaluator, 
  PermissionEvaluationInput, 
  PermissionEvaluationResult, 
  RequestContext 
} from '@mentrily/service-core';
import { WorkspaceMemberRepository } from '../../domain/repositories/workspace-member.repository.js';
import { PolicyModel, PermissionKey } from '@mentrily/security-toolkit';
import { MembershipStatus } from '../../domain/value-objects/index.js';

@Injectable()
export class WorkspacePermissionEvaluator implements PermissionEvaluator {
  constructor(
    @Inject(WorkspaceMemberRepository) private readonly memberRepo: WorkspaceMemberRepository
  ) {}

  async evaluate(
    input: PermissionEvaluationInput,
    context: RequestContext,
  ): Promise<PermissionEvaluationResult> {
    // 1. Deny invalid permission key formats immediately
    if (!PermissionKey.isValid(input.permission)) {
      return { allowed: false, reason: `Invalid permission format: ${input.permission}` };
    }

    // 2. Deny if no workspace context
    if (!context.workspace) {
      return { allowed: false, reason: 'Missing workspace context for workspace-scoped permission' };
    }

    // 3. Deny if no actor
    if (!context.workspace.actorId) {
      return { allowed: false, reason: 'Missing actor in workspace context' };
    }

    // 4. Resolve membership
     
    const member = await this.memberRepo.findByWorkspaceAndPrincipal(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      context.workspace.workspaceId as any,
      context.workspace.actorId
    );

    if (!member) {
      return { allowed: false, reason: 'Actor is not a member of the requested workspace' };
    }

    // 5. Check if suspended/removed
    if (member.status !== MembershipStatus.ACTIVE) {
      return { allowed: false, reason: `Membership is not active (status: ${member.status})` };
    }

    // 6. Resolve roles
    const roles = await this.memberRepo.getMemberRoles(member.id);
    if (!roles || roles.length === 0) {
      return { allowed: false, reason: 'Member has no assigned roles' };
    }

    // 7. Expand and check permissions using PolicyModel
    const hasPermission = PolicyModel.hasPermission(roles, input.permission);

    if (hasPermission) {
      return { allowed: true };
    }

    // 8. Deny by default
    return { allowed: false, reason: `Missing required permission: ${input.permission}` };
  }
}

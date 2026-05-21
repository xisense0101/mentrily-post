import { Inject, Injectable } from '@nestjs/common';
import { InvitationRepository } from '../../domain/repositories/invitation.repository.js';
import { AcceptInvitationInput } from '@mentrily/contract-catalog';
import { InvitationStatus } from '../../domain/index.js';
import { WorkspaceMemberRepository } from '../../../workspace-governance/domain/repositories/workspace-member.repository.js';
import { WorkspaceRoleRepository } from '../../../workspace-governance/domain/repositories/workspace-role.repository.js';
import { MembershipStatus } from '../../../workspace-governance/domain/value-objects/index.js';
import {
  AUDIT_RECORDER,
  OUTBOX_PUBLISHER,
  TRANSACTION_RUNNER,
  type AuditRecorder,
  type OutboxPublisher,
  type RequestContext,
  type TransactionRunner,
  AppError,
} from '@mentrily/service-core';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AcceptWorkspaceInvitation {
  constructor(
    @Inject(InvitationRepository) private readonly invitationRepo: InvitationRepository,
    @Inject(WorkspaceMemberRepository) private readonly memberRepo: WorkspaceMemberRepository,
    @Inject(WorkspaceRoleRepository) private readonly roleRepo: WorkspaceRoleRepository,
    @Inject(AUDIT_RECORDER) private readonly audit: AuditRecorder,
    @Inject(OUTBOX_PUBLISHER) private readonly outbox: OutboxPublisher,
    @Inject(TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
  ) {}

  async execute(input: AcceptInvitationInput, context: RequestContext): Promise<void> {
    return await this.transactionRunner.run(async (tx) => {
      const invitation = await this.invitationRepo.findById(input.invitationId, tx);
      if (!invitation) {
        throw new Error('Invitation not found');
      }

      if (invitation.status !== InvitationStatus.PENDING) {
        throw new Error(`Invitation is already ${invitation.status.toLowerCase()}`);
      }

      if (invitation.expiresAt < new Date()) {
        invitation.status = InvitationStatus.EXPIRED;
        await this.invitationRepo.save(invitation, tx);
        throw new Error('Invitation has expired');
      }

      let invitedRoleId: string | undefined;
      if (invitation.roleKey) {
        const role = await this.roleRepo.findByKey(
          invitation.workspaceId as any,
          invitation.roleKey,
          tx,
        );
        if (!role) {
          throw new AppError(
            'NOT_FOUND',
            `Invited role ${invitation.roleKey} not found in workspace ${invitation.workspaceId}`,
            404,
          );
        }
        invitedRoleId = role.id;
      }

      // 1. Mark as accepted
      invitation.status = InvitationStatus.ACCEPTED;
      invitation.acceptedAt = new Date();
      invitation.updatedAt = new Date();
      await this.invitationRepo.save(invitation, tx);

      // 2. Add to workspace (idempotent member reuse)
      const existingMember = await this.memberRepo.findByWorkspaceAndPrincipal(
        invitation.workspaceId as any,
        input.principalId,
        tx,
      );
      const memberId = existingMember?.id ?? uuidv4();

      if (!existingMember) {
        await this.memberRepo.save(
          {
            id: memberId,
            workspaceId: invitation.workspaceId as any,
            principalId: input.principalId,
            status: MembershipStatus.ACTIVE,
            joinedAt: new Date(),
            createdAt: new Date(),
          },
          tx,
        );
      }

      // 3. Assign the invited role
      if (invitedRoleId) {
        await this.memberRepo.assignRole(memberId, invitedRoleId, tx);
      }

      await this.audit.record(
        {
          action: 'invitation.accepted',
          actorId: input.principalId,
          targetType: 'invitation',
          targetId: input.invitationId,
          metadata: { workspaceId: invitation.workspaceId },
        },
        context,
        tx,
      );

      await this.outbox.publish(
        {
          eventId: uuidv4(),
          eventName: 'workspace.invitation_accepted',
          eventVersion: 1,
          correlationId: context.correlationId,
          occurredAt: new Date().toISOString(),
          workspaceId: invitation.workspaceId,
          payload: { invitationId: input.invitationId, principalId: input.principalId },
        },
        context,
        tx,
      );
    });
  }
}

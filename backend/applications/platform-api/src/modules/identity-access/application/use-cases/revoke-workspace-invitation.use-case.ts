import { Inject, Injectable } from '@nestjs/common';
import { InvitationRepository } from '../../domain/repositories/invitation.repository.js';
import { RevokeInvitationInput } from '@mentrily/contract-catalog';
import { InvitationStatus } from '../../domain/index.js';
import {
  AUDIT_RECORDER,
  OUTBOX_PUBLISHER,
  TRANSACTION_RUNNER,
  type AuditRecorder,
  type OutboxPublisher,
  type RequestContext,
  type TransactionRunner,
} from '@mentrily/service-core';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RevokeWorkspaceInvitation {
  constructor(
    @Inject(InvitationRepository) private readonly invitationRepo: InvitationRepository,
    @Inject(AUDIT_RECORDER) private readonly audit: AuditRecorder,
    @Inject(OUTBOX_PUBLISHER) private readonly outbox: OutboxPublisher,
    @Inject(TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
  ) {}

  async execute(input: RevokeInvitationInput, context: RequestContext): Promise<void> {
    return await this.transactionRunner.run(async (tx) => {
      const invitation = await this.invitationRepo.findById(input.invitationId, tx);
      if (!invitation || invitation.status !== InvitationStatus.PENDING) {
        return;
      }

      invitation.status = InvitationStatus.REVOKED;
      invitation.updatedAt = new Date();
      await this.invitationRepo.save(invitation, tx);

      await this.audit.record(
        {
          action: 'invitation.revoked',
          actorId: input.revokerPrincipalId,
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
          eventName: 'workspace.invitation_revoked',
          eventVersion: 1,
          correlationId: context.correlationId,
          occurredAt: new Date().toISOString(),
          workspaceId: invitation.workspaceId,
          payload: { invitationId: input.invitationId },
        },
        context,
        tx,
      );
    });
  }
}

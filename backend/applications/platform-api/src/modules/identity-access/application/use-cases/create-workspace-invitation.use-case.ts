import { Inject, Injectable } from '@nestjs/common';
import { InvitationRepository } from '../../domain/repositories/invitation.repository.js';
import { CreateInvitationInput } from '@mentrily/contract-catalog';
import { Invitation, InvitationStatus } from '../../domain/index.js';
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
export class CreateWorkspaceInvitation {
  constructor(
    @Inject(InvitationRepository) private readonly invitationRepo: InvitationRepository,
    @Inject(AUDIT_RECORDER) private readonly audit: AuditRecorder,
    @Inject(OUTBOX_PUBLISHER) private readonly outbox: OutboxPublisher,
    @Inject(TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
  ) {}

  async execute(input: CreateInvitationInput, context: RequestContext): Promise<string> {
    const existing = await this.invitationRepo.findPendingByWorkspaceAndEmail(
      input.workspaceId,
      input.email,
    );
    if (
      existing &&
      existing.status === InvitationStatus.PENDING &&
      existing.expiresAt > new Date()
    ) {
      throw new Error(`A pending invitation already exists for ${input.email} in this workspace.`);
    }

    return await this.transactionRunner.run(async (tx) => {
      const invitationId = uuidv4();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      const invitation: Invitation = {
        id: invitationId,
        email: input.email,
        workspaceId: input.workspaceId as any,
        roleKey: input.roleKey,
        inviterPrincipalId: input.inviterPrincipalId,
        status: InvitationStatus.PENDING,
        token: uuidv4(),
        expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.invitationRepo.save(invitation, tx);

      await this.audit.record(
        {
          action: 'invitation.created',
          actorId: input.inviterPrincipalId,
          targetType: 'invitation',
          targetId: invitationId,
          metadata: { workspaceId: input.workspaceId, email: input.email, roleKey: input.roleKey },
        },
        context,
        tx,
      );

      await this.outbox.publish(
        {
          eventId: uuidv4(),
          eventName: 'workspace.invitation_created',
          eventVersion: 1,
          correlationId: context.correlationId,
          occurredAt: new Date().toISOString(),
          workspaceId: input.workspaceId,
          payload: { invitationId, email: input.email, workspaceId: input.workspaceId },
        },
        context,
        tx,
      );

      return invitationId;
    });
  }
}

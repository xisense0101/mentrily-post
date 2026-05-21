import { Inject, Injectable } from '@nestjs/common';
import { WorkspaceMemberRepository } from '../../domain/repositories/workspace-member.repository.js';
import { AddWorkspaceMemberInput } from '@mentrily/contract-catalog';
import { MembershipStatus } from '../../domain/index.js';
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
export class AddWorkspaceMember {
  constructor(
    @Inject(WorkspaceMemberRepository) private readonly memberRepo: WorkspaceMemberRepository,
    @Inject(AUDIT_RECORDER) private readonly audit: AuditRecorder,
    @Inject(OUTBOX_PUBLISHER) private readonly outbox: OutboxPublisher,
    @Inject(TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
  ) {}

  async execute(input: AddWorkspaceMemberInput, context: RequestContext): Promise<string> {
    const actorId = context.workspace?.actorId;
    if (!actorId) {
      throw new AppError('UNAUTHORIZED', 'Missing actor in workspace context.', 401);
    }

    return await this.transactionRunner.run(async (tx) => {
      // 1. Check if already a member (idempotency)
      const existing = await this.memberRepo.findByWorkspaceAndPrincipal(
        input.workspaceId as any,
        input.principalId,
        tx,
      );
      if (existing) {
        return existing.id;
      }

      const memberId = uuidv4();
      await this.memberRepo.save(
        {
          id: memberId,
          workspaceId: input.workspaceId as any,
          principalId: input.principalId,
          status: MembershipStatus.ACTIVE,
          joinedAt: new Date(),
          createdAt: new Date(),
        },
        tx,
      );

      await this.audit.record(
        {
          action: 'member.added',
          actorId,
          targetType: 'workspace_member',
          targetId: memberId,
          metadata: { workspaceId: input.workspaceId },
        },
        context,
        tx,
      );

      await this.outbox.publish(
        {
          eventId: uuidv4(),
          eventName: 'workspace.member_added',
          eventVersion: 1,
          correlationId: context.correlationId,
          occurredAt: new Date().toISOString(),
          workspaceId: input.workspaceId,
          payload: { workspaceId: input.workspaceId, principalId: input.principalId, memberId },
        },
        context,
        tx,
      );

      return memberId;
    });
  }
}

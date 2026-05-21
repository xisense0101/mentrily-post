import { TransactionContext } from '@mentrily/service-core';
import { Invitation } from '../entities/index.js';

export abstract class InvitationRepository {
  abstract findById(id: string, transaction?: TransactionContext): Promise<Invitation | null>;
  abstract findByToken(token: string, transaction?: TransactionContext): Promise<Invitation | null>;
  abstract findPendingByWorkspaceAndEmail(
    workspaceId: string,
    email: string,
    transaction?: TransactionContext,
  ): Promise<Invitation | null>;
  abstract save(invitation: Invitation, transaction?: TransactionContext): Promise<void>;
}

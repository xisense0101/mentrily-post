export interface LearningDomainEvent<TPayload = Record<string, unknown>> {
  eventName: string;
  eventVersion: number;
  occurredAt: Date;
  tenantId: string;
  workspaceId: string;
  aggregateId: string;
  payload: TPayload;
}

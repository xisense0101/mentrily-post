export interface ContentDomainEvent<TPayload = Record<string, unknown>> {
  eventName: string;
  eventVersion: number;
  occurredAt: Date;
  tenantId: string;
  workspaceId: string;
  aggregateId: string;
  payload: TPayload;
}

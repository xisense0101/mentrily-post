export interface MediaDomainEvent<
  TPayload extends Record<string, unknown> = Record<string, unknown>,
> {
  eventName: string;
  eventVersion: 1;
  aggregateId: string;
  tenantId: string;
  workspaceId: string;
  occurredAt: Date;
  payload: TPayload;
}

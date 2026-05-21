/**
 * AssessmentDomainEvent Base
 * Base interface for all assessment domain events
 */

export interface AssessmentDomainEvent<TPayload = Record<string, unknown>> {
  eventName: string;
  eventVersion: number;
  occurredAt: Date;
  tenantId: string;
  workspaceId: string;
  aggregateId: string;
  payload: TPayload;
}

/**
 * Domain event metadata helpers
 */

export const validateEventTenantWorkspace = (tenantId: string, workspaceId: string): void => {
  if (!tenantId || tenantId === '') {
    throw new Error('tenantId cannot be empty');
  }
  if (!workspaceId || workspaceId === '') {
    throw new Error('workspaceId cannot be empty');
  }
};

export const createEventBase = <TPayload>(
  eventName: string,
  aggregateId: string,
  tenantId: string,
  workspaceId: string,
  payload: TPayload,
): AssessmentDomainEvent<TPayload> => {
  validateEventTenantWorkspace(tenantId, workspaceId);

  return {
    eventName,
    eventVersion: 1,
    occurredAt: new Date(),
    tenantId,
    workspaceId,
    aggregateId,
    payload,
  };
};

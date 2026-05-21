import type { CommunicationDomainEvent } from './communication-domain-event.js';

function event<TPayload extends Record<string, unknown>>(
  eventName: string,
  aggregateId: string,
  tenantId: string,
  workspaceId: string,
  payload: TPayload,
): CommunicationDomainEvent<TPayload> {
  return {
    eventName,
    eventVersion: 1,
    aggregateId,
    tenantId,
    workspaceId,
    occurredAt: new Date(),
    payload,
  };
}

export const communicationTemplateCreated = (input: {
  tenantId: string;
  workspaceId: string;
  templateId: string;
  channel: string;
  status: string;
  key: string;
}) => event(
  'communication.template.created',
  input.templateId,
  input.tenantId,
  input.workspaceId,
  {
    templateId: input.templateId,
    key: input.key,
    channel: input.channel,
    status: input.status,
  },
);

export const communicationTemplateActivated = (input: {
  tenantId: string;
  workspaceId: string;
  templateId: string;
  channel: string;
  status: string;
}) => event(
  'communication.template.activated',
  input.templateId,
  input.tenantId,
  input.workspaceId,
  {
    templateId: input.templateId,
    channel: input.channel,
    status: input.status,
  },
);

export const communicationTemplateArchived = (input: {
  tenantId: string;
  workspaceId: string;
  templateId: string;
  channel: string;
  status: string;
}) => event(
  'communication.template.archived',
  input.templateId,
  input.tenantId,
  input.workspaceId,
  {
    templateId: input.templateId,
    channel: input.channel,
    status: input.status,
  },
);

export const communicationIntentCreated = (input: {
  tenantId: string;
  workspaceId: string;
  intentId: string;
  templateId?: string | undefined;
  channel: string;
  status: string;
  provider: string;
}) => event(
  'communication.intent.created',
  input.intentId,
  input.tenantId,
  input.workspaceId,
  {
    intentId: input.intentId,
    templateId: input.templateId,
    channel: input.channel,
    status: input.status,
    provider: input.provider,
  },
);

export const communicationIntentQueued = (input: {
  tenantId: string;
  workspaceId: string;
  intentId: string;
  channel: string;
  status: string;
  provider: string;
}) => event(
  'communication.intent.queued',
  input.intentId,
  input.tenantId,
  input.workspaceId,
  {
    intentId: input.intentId,
    channel: input.channel,
    status: input.status,
    provider: input.provider,
  },
);

export const communicationIntentDispatched = (input: {
  tenantId: string;
  workspaceId: string;
  intentId: string;
  channel: string;
  status: string;
  provider: string;
}) => event(
  'communication.intent.dispatched',
  input.intentId,
  input.tenantId,
  input.workspaceId,
  {
    intentId: input.intentId,
    channel: input.channel,
    status: input.status,
    provider: input.provider,
  },
);

export const communicationIntentFailed = (input: {
  tenantId: string;
  workspaceId: string;
  intentId: string;
  channel: string;
  status: string;
  provider: string;
  failureReason?: string | undefined;
}) => event(
  'communication.intent.failed',
  input.intentId,
  input.tenantId,
  input.workspaceId,
  {
    intentId: input.intentId,
    channel: input.channel,
    status: input.status,
    provider: input.provider,
    ...(input.failureReason ? { failureReason: input.failureReason } : {}),
  },
);

export const communicationIntentCancelled = (input: {
  tenantId: string;
  workspaceId: string;
  intentId: string;
  channel: string;
  status: string;
  provider: string;
}) => event(
  'communication.intent.cancelled',
  input.intentId,
  input.tenantId,
  input.workspaceId,
  {
    intentId: input.intentId,
    channel: input.channel,
    status: input.status,
    provider: input.provider,
  },
);

export interface OutboxRelayDispatchMetadata {
  messageId: string;
  eventId: string;
  eventName: string;
  attemptCount: number;
}

export interface OutboxRelayRunResult {
  claimed: number;
  published: number;
  retried: number;
  failed: number;
}

export interface InboxProcessingMetadata {
  inboxMessageId: string;
  source: string;
  externalEventId: string;
  eventName: string;
}

export interface InboxProcessingRunResult {
  claimed: number;
  processed: number;
  failed: number;
}

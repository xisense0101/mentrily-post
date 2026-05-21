import type { InboxEventHandler } from './noop-inbox-handler.js';
import { NoopInboxHandler } from './noop-inbox-handler.js';

export class InboxHandlerRegistry {
  private readonly handlers = new Map<string, InboxEventHandler>();

  constructor(
    entries: Array<{ eventName: string; handler: InboxEventHandler }> = [],
    private readonly defaultHandler: InboxEventHandler = new NoopInboxHandler(),
  ) {
    for (const entry of entries) {
      this.handlers.set(entry.eventName, entry.handler);
    }
  }

  register(eventName: string, handler: InboxEventHandler): void {
    this.handlers.set(eventName, handler);
  }

  resolve(eventName: string): InboxEventHandler {
    return this.handlers.get(eventName) ?? this.defaultHandler;
  }

  has(eventName: string): boolean {
    return this.handlers.has(eventName);
  }
}

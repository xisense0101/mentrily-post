import { AccessSession } from '../entities/index.js';

export abstract class AccessSessionRepository {
  abstract findById(id: string): Promise<AccessSession | null>;
  abstract save(session: AccessSession): Promise<void>;
  abstract delete(id: string): Promise<void>;
}

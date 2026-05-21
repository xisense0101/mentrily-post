import { Team } from '../entities/index.js';
import { WorkspaceId } from '../value-objects/index.js';

export abstract class TeamRepository {
  abstract findById(id: string): Promise<Team | null>;
  abstract findAllByWorkspaceId(workspaceId: WorkspaceId): Promise<Team[]>;
  abstract save(team: Team): Promise<void>;
  abstract delete(id: string): Promise<void>;
}

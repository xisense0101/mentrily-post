import { WorkspaceBranding } from '../entities/index.js';
import { WorkspaceId } from '../value-objects/index.js';

export abstract class WorkspaceBrandingRepository {
  abstract findByWorkspaceId(workspaceId: WorkspaceId): Promise<WorkspaceBranding | null>;
  abstract save(branding: WorkspaceBranding): Promise<void>;
}

import { WorkspaceId } from '../value-objects/index.js';

export interface WorkspaceBranding {
  id: string;
  workspaceId: WorkspaceId;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  customDomain?: string;
  createdAt: Date;
  updatedAt: Date;
}

import { ContentVersion } from '../entities/index.js';
import { ContentVersionStatus } from '../value-objects/index.js';

export class ContentVersioningPolicyService {
  nextVersionNumber(existingVersions: ContentVersion[]): number {
    if (existingVersions.length === 0) return 1;
    return Math.max(...existingVersions.map((version) => version.versionNumber)) + 1;
  }

  canReplaceDraft(version: ContentVersion): { allowed: boolean; reason?: string } {
    if (version.status !== ContentVersionStatus.DRAFT) {
      return { allowed: false, reason: 'only draft versions can be replaced' };
    }
    return { allowed: true };
  }
}

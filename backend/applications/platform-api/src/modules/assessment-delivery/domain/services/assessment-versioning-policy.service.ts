/**
 * AssessmentVersioningPolicyService
 * Manages versioning rules and state transitions
 */

import { AssessmentVersion } from '../entities/index.js';

export interface VersioningCheckResult {
  allowed: boolean;
  reason?: string;
}

export class AssessmentVersioningPolicyService {
  /**
   * Calculate the next version number given existing versions
   */
  nextVersionNumber(existingVersions: AssessmentVersion[]): number {
    if (existingVersions.length === 0) {
      return 1; // First version is always 1
    }

    const maxVersion = Math.max(...existingVersions.map((v) => v.versionNumber));
    return maxVersion + 1;
  }

  /**
   * Check if a draft version can be replaced with new content
   */
  canReplaceDraft(version: AssessmentVersion): VersioningCheckResult {
    if (!version.isDraft()) {
      return { allowed: false, reason: 'Only draft versions can be replaced' };
    }

    return { allowed: true };
  }
}

import { Injectable } from '@nestjs/common';
import { PrincipalEntitlementRepository } from '../../domain/repositories/principal-entitlement.repository.js';
import { PrincipalEntitlementProfile } from '../../domain/entities/principal-entitlement-profile.entity.js';
import { FreePlan } from '../../domain/services/entitlement-resolver.service.js';

@Injectable()
export class InMemoryPrincipalEntitlementRepository implements PrincipalEntitlementRepository {
  private profiles = new Map<string, PrincipalEntitlementProfile>();

  async getByPrincipalId(principalId: string): Promise<PrincipalEntitlementProfile | null> {
    const profile = this.profiles.get(principalId);
    if (profile) {
      return profile;
    }

    // Default personal principals to Free without creating a workspace.
    return {
      principalId,
      planId: FreePlan.id,
      overrides: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  // Test helper
  setProfile(profile: PrincipalEntitlementProfile): void {
    this.profiles.set(profile.principalId, profile);
  }

  // Test helper
  clear(): void {
    this.profiles.clear();
  }
}

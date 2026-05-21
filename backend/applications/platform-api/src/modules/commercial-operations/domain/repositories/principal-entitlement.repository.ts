import { PrincipalEntitlementProfile } from '../entities/principal-entitlement-profile.entity.js';

export abstract class PrincipalEntitlementRepository {
  abstract getByPrincipalId(principalId: string): Promise<PrincipalEntitlementProfile | null>;
}

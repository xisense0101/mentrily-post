import { Principal } from '../entities/index.js';
import { PrincipalId } from '../value-objects/index.js';

export abstract class PrincipalRepository {
  abstract findById(id: PrincipalId): Promise<Principal | null>;
  abstract findByEmail(email: string): Promise<Principal | null>;
  abstract save(principal: Principal): Promise<void>;
}

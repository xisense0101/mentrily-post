export type WorkspaceId = string;

export class WorkspaceSlug {
  constructor(private readonly value: string) {
    if (!this.isValid(value)) {
      throw new Error(`Invalid workspace slug: ${value}`);
    }
  }

  private isValid(slug: string): boolean {
    const slugRegex = /^[a-z0-9](-?[a-z0-9])*$/;
    return slugRegex.test(slug) && slug.length >= 3 && slug.length <= 50;
  }

  toString(): string {
    return this.value;
  }
}

export enum WorkspaceStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DELETED = 'DELETED',
}

export enum MembershipStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  REMOVED = 'REMOVED',
}

export enum WorkspaceDomainStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  FAILED = 'FAILED',
}

export interface ExternalUserDTO {
  externalId: string;
  email: string;
  displayName?: string | undefined;
  avatarUrl?: string | undefined;
  metadata?: Record<string, any> | undefined;
}

export type IdentityProviderEventType = 'user.created' | 'user.updated' | 'user.deleted';

export interface IdentityProviderEventDTO {
  type: IdentityProviderEventType;
  externalId: string;
  data: Partial<ExternalUserDTO>;
  timestamp: Date;
}

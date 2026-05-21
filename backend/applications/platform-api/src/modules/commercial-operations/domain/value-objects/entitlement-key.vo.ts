export const EntitlementCatalog = {
  COURSES_LIMIT: 'courses.limit',
  EXAMS_MONTHLY_LIMIT: 'exams.monthly_limit',
  LEARNERS_LIMIT: 'learners.limit',
  QUESTION_TYPES_BASIC_ONLY: 'question_types.basic_only',
  TEAM_FEATURES_ENABLED: 'team_features.enabled',
  ADMIN_SEATS_LIMIT: 'admin_seats.limit',
  CREATOR_SEATS_LIMIT: 'creator_seats.limit',
  WHITE_LABEL_ENABLED: 'white_label.enabled',
  CUSTOM_DOMAINS_ENABLED: 'custom_domains.enabled',
  SSO_ENABLED: 'sso.enabled',
  SCIM_ENABLED: 'scim.enabled',
} as const;

export type EntitlementKeyString = typeof EntitlementCatalog[keyof typeof EntitlementCatalog];

export class EntitlementKey {
  constructor(private readonly value: string) {
    if (!this.isValid(value)) {
      throw new Error(`Invalid entitlement key format: ${value}`);
    }
  }

  private isValid(key: string): boolean {
    const keyRegex = /^[a-z0-9_]+(\.[a-z0-9_]+)+$/;
    return keyRegex.test(key);
  }

  toString(): string {
    return this.value;
  }
}

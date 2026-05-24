export type CampaignStatusContract =
  | 'DRAFT'
  | 'READY'
  | 'SCHEDULED'
  | 'SENDING_DISABLED'
  | 'ARCHIVED';

export type CampaignChannelContract = 'EMAIL' | 'SMS' | 'IN_APP';

export type CampaignAudienceTypeContract =
  | 'ALL_WORKSPACE_MEMBERS'
  | 'WORKSPACE_ADMINS'
  | 'COURSE_LEARNERS'
  | 'ASSESSMENT_PARTICIPANTS'
  | 'CONTENT_AUTHORS'
  | 'MEDIA_OWNERS'
  | 'CUSTOM_USER_IDS';

export interface CampaignContract {
  id: string;
  tenantId: string;
  workspaceId: string;
  name: string;
  description?: string | undefined;
  status: CampaignStatusContract;
  channel: CampaignChannelContract;
  templateId?: string | undefined;
  subject?: string | undefined;
  body: string;
  audienceType: CampaignAudienceTypeContract;
  audienceConfig: Record<string, unknown>;
  scheduledFor?: string | undefined;
  createdByPrincipalId: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | undefined;
}

export interface CreateCampaignRequestContract {
  name: string;
  description?: string | undefined;
  channel: CampaignChannelContract;
  templateId?: string | undefined;
  subject?: string | undefined;
  body: string;
  audienceType: CampaignAudienceTypeContract;
  audienceConfig?: Record<string, unknown> | undefined;
  scheduledFor?: string | undefined;
}

export interface UpdateCampaignRequestContract {
  name?: string | undefined;
  description?: string | undefined;
  channel?: CampaignChannelContract | undefined;
  templateId?: string | undefined;
  subject?: string | undefined;
  body?: string | undefined;
  audienceType?: CampaignAudienceTypeContract | undefined;
  audienceConfig?: Record<string, unknown> | undefined;
  scheduledFor?: string | undefined;
}

export interface CampaignAudiencePreviewRequestContract {
  audienceType: CampaignAudienceTypeContract;
  audienceConfig?: Record<string, unknown> | undefined;
}

export interface CampaignAudiencePreviewRecipientContract {
  userId: string;
  displayName: string;
  email?: string | undefined;
  role: string;
}

export interface CampaignAudiencePreviewResponseContract {
  totalCount: number;
  recipients: CampaignAudiencePreviewRecipientContract[];
}

export interface CampaignMessagePreviewRequestContract {
  templateId?: string | undefined;
  subject?: string | undefined;
  body: string;
  variables?: Record<string, string | number | boolean | null> | undefined;
}

export interface CampaignMessagePreviewResponseContract {
  subject?: string | undefined;
  body: string;
}

export interface ScheduleCampaignRequestContract {
  scheduledFor: string;
}

export const analyticsEventCategories = [
  'LEARNING',
  'ASSESSMENT',
  'CONTENT',
  'MEDIA',
  'COMMUNICATION',
  'CAMPAIGN',
  'SYSTEM',
] as const;

export type AnalyticsEventCategoryContract = (typeof analyticsEventCategories)[number];

export const analyticsSubjectTypes = [
  'COURSE',
  'ENROLLMENT',
  'LESSON_PROGRESS',
  'ASSESSMENT',
  'ASSESSMENT_ATTEMPT',
  'ASSESSMENT_RESULT',
  'CONTENT_DOCUMENT',
  'MEDIA_ASSET',
  'NOTIFICATION_INTENT',
  'CAMPAIGN',
  'WORKSPACE',
] as const;

export type AnalyticsSubjectTypeContract = (typeof analyticsSubjectTypes)[number];

export const analyticsMetricKeys = [
  'learning.total_courses',
  'learning.published_courses',
  'learning.active_enrollments',
  'learning.lesson_completions',
  'learning.course_completions',
  'learning.linked_assessments',
  'learning.required_assessment_blockers',
  'assessment.total_assessments',
  'assessment.published_assessments',
  'assessment.attempts_started',
  'assessment.submissions',
  'assessment.pending_grading',
  'assessment.results_released',
  'assessment.pass_rate_released',
  'content.total_documents',
  'content.published_documents',
  'content.recently_updated_documents',
  'media.total_assets',
  'media.processing_failed',
  'media.quarantined_assets',
  'communication.notification_intents_created',
  'communication.delivered',
  'communication.failed',
  'communication.pending_delivery',
  'campaign.total_campaigns',
  'campaign.draft_campaigns',
  'campaign.scheduled_campaigns',
  'campaign.archived_campaigns',
] as const;

export type AnalyticsMetricKeyContract = (typeof analyticsMetricKeys)[number];

export interface AnalyticsDashboardMetricContract {
  key: AnalyticsMetricKeyContract;
  value: number;
  label: string;
}

export interface AnalyticsDashboardActivityItemContract {
  id: string;
  category: AnalyticsEventCategoryContract;
  type: string;
  subjectType: AnalyticsSubjectTypeContract;
  subjectId?: string;
  title: string;
  description: string;
  occurredAt: string;
}

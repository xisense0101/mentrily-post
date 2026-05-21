export enum LearningCourseStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export function isPublishableStatus(status: LearningCourseStatus): boolean {
  return status === LearningCourseStatus.DRAFT;
}

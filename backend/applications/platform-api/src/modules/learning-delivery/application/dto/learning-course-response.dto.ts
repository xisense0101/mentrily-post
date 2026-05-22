import type { MediaAssetContract } from '@mentrily/contract-catalog';

export interface LearningLessonResponse {
  id: string;
  title: string;
  kind: string;
  position: number;
  estimatedMinutes?: number | undefined;
  contentRef?: string | undefined;
  isRequired: boolean;
  mediaAsset?: MediaAssetContract | undefined;
}

export interface LearningSectionResponse {
  id: string;
  title: string;
  position: number;
  lessons: LearningLessonResponse[];
}

export interface LearningCourseResponse {
  id: string;
  title: string;
  slug: string;
  description?: string | undefined;
  status: string;
  visibility: string;
  sections: LearningSectionResponse[];
}

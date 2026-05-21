export interface AddLearningLessonInput {
  title: string;
  kind: string;
  estimatedMinutes?: number;
  contentRef?: string;
  isRequired?: boolean;
}

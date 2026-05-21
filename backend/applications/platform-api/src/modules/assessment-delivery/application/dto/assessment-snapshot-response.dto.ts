export interface AssessmentSnapshotQuestionResponse {
  id: string;
  sectionId?: string | undefined;
  kind: string;
  title: string;
  prompt: Record<string, unknown>;
  options: Array<Record<string, unknown>>;
  answerKey?: Record<string, unknown> | undefined;
  points: number;
  gradingMode: string;
  position: number;
  metadata: Record<string, unknown>;
}

export interface AssessmentSnapshotSectionResponse {
  id: string;
  title: string;
  description?: string | undefined;
  position: number;
  metadata: Record<string, unknown>;
  questions: AssessmentSnapshotQuestionResponse[];
}

export interface AssessmentPublishedSnapshotResponse {
  id: string;
  assessmentId: string;
  versionId: string;
  versionNumber: number;
  sections: AssessmentSnapshotSectionResponse[];
  looseQuestions: AssessmentSnapshotQuestionResponse[];
  publishedByPrincipalId: string;
  publishedAt: string;
  createdAt: string;
}

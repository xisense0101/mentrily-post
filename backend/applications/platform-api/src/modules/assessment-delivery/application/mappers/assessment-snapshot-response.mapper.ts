import { AssessmentPublishedSnapshot } from '../../domain/entities/index.js';
import { AssessmentPublishedSnapshotResponse } from '../dto/index.js';
import { readQuestionMediaState, sanitizeQuestionMetadata } from '../support/index.js';

function sanitizeAnswerKeyForLearner(
  kind: string,
  answerKey?: import('../../domain/value-objects/question-answer-key.vo.js').QuestionAnswerKey,
): Record<string, unknown> | undefined {
  if (!answerKey) return undefined;
  const obj = answerKey.toObject();
  if (kind === 'CODE') {
    if (obj.codingConfig) {
      return {
        codingLearnerConfig: {
          allowedLanguages: obj.codingConfig.allowedLanguages,
          starterCodeByLanguage: obj.codingConfig.starterCodeByLanguage,
          publicSampleTestCases: (obj.codingConfig.publicSampleTestCases ?? []).map((tc) => ({
            id: tc.id,
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            ...(tc.weight !== undefined ? { weight: tc.weight } : {}),
          })),
        },
      } as unknown as Record<string, unknown>;
    }
  }
  return obj as unknown as Record<string, unknown>;
}

function mapQuestion(question: import('../../domain/entities/index.js').AssessmentQuestion) {
  const mediaState = readQuestionMediaState(question.metadata);
  return {
    id: question.id,
    sectionId: question.sectionId,
    kind: question.kind,
    title: question.title,
    prompt: { ...question.prompt },
    options: question.options.map((option) => ({ ...option })),
    answerKey: sanitizeAnswerKeyForLearner(question.kind, question.answerKey),
    points: question.points.value(),
    gradingMode: question.gradingMode,
    position: question.position,
    metadata: sanitizeQuestionMetadata(question.metadata),
    ...(mediaState.attachments ? { attachments: mediaState.attachments } : {}),
    ...(mediaState.fileUploadConfig ? { fileUploadConfig: mediaState.fileUploadConfig } : {}),
  };
}

export function mapSnapshotToResponse(
  snapshot: AssessmentPublishedSnapshot,
): AssessmentPublishedSnapshotResponse {
  return {
    id: snapshot.id,
    assessmentId: snapshot.assessmentId,
    versionId: snapshot.versionId,
    versionNumber: snapshot.versionNumber,
    sections: snapshot.sections.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      position: s.position,
      metadata: { ...s.metadata },
      questions: s.questions.map(mapQuestion),
    })),
    looseQuestions: snapshot.looseQuestions.map(mapQuestion),
    publishedByPrincipalId: snapshot.publishedByPrincipalId,
    publishedAt: snapshot.publishedAt.toISOString(),
    createdAt: snapshot.createdAt.toISOString(),
  };
}

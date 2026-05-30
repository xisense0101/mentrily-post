import {
  Assessment,
  AssessmentVersion,
  AssessmentSection,
  AssessmentQuestion,
  GradingRubric,
  GradingRule,
} from '../../domain/entities/index.js';
import {
  AssessmentResponse,
  AssessmentVersionResponse,
  AssessmentSectionResponse,
  AssessmentQuestionResponse,
  GradingRubricResponse,
  GradingRuleResponse,
} from '../dto/index.js';
import { readQuestionMediaState, sanitizeQuestionMetadata } from '../support/index.js';

function mapQuestion(q: AssessmentQuestion): AssessmentQuestionResponse {
  const mediaState = readQuestionMediaState(q.metadata);
  return {
    id: q.id,
    sectionId: q.sectionId,
    kind: q.kind,
    title: q.title,
    prompt: { ...q.prompt },
    options: q.options.map((o) => ({ ...o })),
    answerKey: q.answerKey
      ? (q.answerKey.toObject() as unknown as Record<string, unknown>)
      : undefined,
    points: q.points.value(),
    gradingMode: q.gradingMode,
    position: q.position,
    metadata: sanitizeQuestionMetadata(q.metadata),
    ...(mediaState.attachments ? { attachments: mediaState.attachments } : {}),
    ...(mediaState.fileUploadConfig ? { fileUploadConfig: mediaState.fileUploadConfig } : {}),
  };
}

function mapSection(s: AssessmentSection): AssessmentSectionResponse {
  return {
    id: s.id,
    title: s.title,
    description: s.description,
    position: s.position,
    metadata: { ...s.metadata },
    questions: s.questions.map(mapQuestion),
  };
}

function mapVersion(v: AssessmentVersion): AssessmentVersionResponse {
  return {
    id: v.id,
    versionNumber: v.versionNumber,
    status: v.status,
    createdByPrincipalId: v.createdByPrincipalId,
    createdAt: v.createdAt.toISOString(),
    publishedAt: v.publishedAt?.toISOString(),
    supersededAt: v.supersededAt?.toISOString(),
    sections: v.sections.map(mapSection),
    looseQuestions: v.looseQuestions.map(mapQuestion),
  };
}

function mapRubric(r: GradingRubric): GradingRubricResponse {
  return {
    id: r.id,
    title: r.title,
    criteria: r.criteria.map((c) => ({ ...c })),
  };
}

function mapRule(r: GradingRule): GradingRuleResponse {
  return {
    id: r.id,
    questionId: r.questionId,
    mode: r.mode,
    ruleType: r.ruleType,
    config: { ...r.config },
  };
}

export function mapAssessmentToResponse(a: Assessment): AssessmentResponse {
  return {
    id: a.id,
    purpose: a.purpose,
    status: a.status,
    visibility: a.visibility,
    title: a.title,
    description: a.description,
    ownerPrincipalId: a.ownerPrincipalId,
    attemptPolicy: {
      maxAttempts: a.attemptPolicy.maxAttempts,
      allowRetake: a.attemptPolicy.allowRetake,
      shuffleQuestions: a.attemptPolicy.shuffleQuestions,
      shuffleOptions: a.attemptPolicy.shuffleOptions,
    },
    timeLimitMinutes: a.timeLimit.isTimed() ? a.timeLimit.minutes() : undefined,
    resultReleasePolicy: a.resultReleasePolicy,
    metadata: { ...a.metadata },
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
    publishedAt: a.publishedAt?.toISOString(),
    archivedAt: a.archivedAt?.toISOString(),
    currentDraftVersion: a.currentDraftVersion ? mapVersion(a.currentDraftVersion) : undefined,
    publishedSnapshotId: a.publishedSnapshot?.id,
    gradingRubrics: a.gradingRubrics.map(mapRubric),
    gradingRules: a.gradingRules.map(mapRule),
  };
}

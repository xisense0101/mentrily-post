import type { Prisma } from '@prisma/client';
import {
  Assessment,
  AssessmentVersion,
  AssessmentSection,
  AssessmentQuestion,
  AssessmentPublishedSnapshot,
  GradingRubric,
  GradingRule,
  AttemptPolicy,
  TimeLimit,
  QuestionPoints,
  QuestionOption,
  QuestionAnswerKey,
} from '../../../domain/index.js';

type PersistenceQuestion = {
  id: string;
  assessmentId: string;
  versionId: string;
  sectionId: string | null;
  kind: string;
  title: string;
  prompt: unknown;
  options: unknown;
  answerKey: unknown;
  points: number;
  gradingMode: string;
  position: number;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
};

type PersistenceSection = {
  id: string;
  assessmentId: string;
  versionId: string;
  title: string;
  description: string | null;
  position: number;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
  questions?: PersistenceQuestion[];
};

type PersistenceVersion = {
  id: string;
  assessmentId: string;
  versionNumber: number;
  status: string;
  createdByPrincipalId: string;
  createdAt: Date;
  publishedAt: Date | null;
  supersededAt: Date | null;
  sections?: PersistenceSection[];
  questions?: PersistenceQuestion[];
};

type PersistenceRubric = {
  id: string;
  assessmentId: string;
  title: string;
  criteria: unknown;
  createdAt: Date;
  updatedAt: Date;
};

type PersistenceRule = {
  id: string;
  assessmentId: string;
  questionId: string | null;
  mode: string;
  ruleType: string;
  config: unknown;
  createdAt: Date;
  updatedAt: Date;
};

type PersistenceSnapshot = {
  id: string;
  assessmentId: string;
  versionId: string;
  versionNumber: number;
  sections: unknown;
  looseQuestions: unknown;
  publishedByPrincipalId: string;
  publishedAt: Date;
  createdAt: Date;
};

type PersistenceAssessment = {
  id: string;
  tenantId: string;
  workspaceId: string;
  ownerPrincipalId: string;
  purpose: string;
  status: string;
  visibility: string;
  title: string;
  description: string | null;
  attemptPolicy: unknown;
  timeLimitMinutes: number | null;
  resultReleasePolicy: string;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  archivedAt: Date | null;
  currentDraftVersion?: PersistenceVersion | null;
  publishedSnapshot?: PersistenceSnapshot | null;
  gradingRubrics?: PersistenceRubric[];
  gradingRules?: PersistenceRule[];
};

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }
  return { ...(value as Record<string, unknown>) };
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toInputJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function optionToPlain(option: unknown): Record<string, unknown> {
  if (
    option &&
    typeof option === 'object' &&
    'toObject' in option &&
    typeof (option as { toObject: () => unknown }).toObject === 'function'
  ) {
    return (option as { toObject: () => Record<string, unknown> }).toObject();
  }
  return asRecord(option);
}

export function toDomainQuestion(record: PersistenceQuestion): AssessmentQuestion {
  return AssessmentQuestion.restore({
    id: record.id,
    assessmentId: record.assessmentId,
    ...(record.sectionId ? { sectionId: record.sectionId } : {}),
    kind: record.kind as import('../../../domain/index.js').QuestionKind,
    title: record.title,
    prompt: asRecord(record.prompt),
    options: asArray(record.options).map((o) =>
      QuestionOption.create(o as unknown as import('../../../domain/index.js').QuestionOptionProps),
    ),
    ...(record.answerKey
      ? { answerKey: QuestionAnswerKey.create(asRecord(record.answerKey)) }
      : {}),
    points: QuestionPoints.create(record.points),
    gradingMode: record.gradingMode as import('../../../domain/index.js').GradingMode,
    position: record.position,
    metadata: asRecord(record.metadata),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export function toDomainSection(record: PersistenceSection): AssessmentSection {
  return AssessmentSection.restore({
    id: record.id,
    assessmentId: record.assessmentId,
    title: record.title,
    ...(record.description !== null ? { description: record.description } : {}),
    position: record.position,
    metadata: asRecord(record.metadata),
    questions: (record.questions ?? []).map(toDomainQuestion),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export function toDomainVersion(record: PersistenceVersion): AssessmentVersion {
  return AssessmentVersion.restore({
    id: record.id,
    assessmentId: record.assessmentId,
    versionNumber: record.versionNumber,
    status: record.status as import('../../../domain/index.js').AssessmentVersionStatus,
    sections: (record.sections ?? []).map(toDomainSection),
    looseQuestions: (record.questions ?? []).filter((q) => !q.sectionId).map(toDomainQuestion),
    createdByPrincipalId: record.createdByPrincipalId,
    createdAt: record.createdAt,
    ...(record.publishedAt ? { publishedAt: record.publishedAt } : {}),
    ...(record.supersededAt ? { supersededAt: record.supersededAt } : {}),
  });
}

export function toDomainRubric(record: PersistenceRubric): GradingRubric {
  const criteria = asArray(record.criteria)
    .map((c) => asRecord(c))
    .filter(
      (c) =>
        typeof c.id === 'string' && typeof c.label === 'string' && typeof c.maxPoints === 'number',
    )
    .map(
      (c) =>
        c as unknown as import('../../../domain/entities/grading-rubric.entity.js').GradingRubricCriterion,
    );
  return GradingRubric.restore({
    id: record.id,
    assessmentId: record.assessmentId,
    title: record.title,
    criteria,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export function toDomainRule(record: PersistenceRule): GradingRule {
  return GradingRule.restore({
    id: record.id,
    assessmentId: record.assessmentId,
    ...(record.questionId ? { questionId: record.questionId } : {}),
    mode: record.mode as import('../../../domain/index.js').GradingMode,
    ruleType:
      record.ruleType as import('../../../domain/entities/grading-rule.entity.js').GradingRuleType,
    config: asRecord(record.config),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export function toDomainSnapshot(record: PersistenceSnapshot): AssessmentPublishedSnapshot {
  // Parsing sections from JSON
  const sectionsData = asArray(record.sections);
  const sections = sectionsData.map((s) => {
    const sRec = asRecord(s);
    return AssessmentSection.restore({
      id: String(sRec.id),
      assessmentId: record.assessmentId,
      title: String(sRec.title),
      ...(sRec.description ? { description: String(sRec.description) } : {}),
      position: Number(sRec.position),
      metadata: asRecord(sRec.metadata),
      questions: asArray(sRec.questions).map((q) => {
        const qRec = asRecord(q);
        return AssessmentQuestion.restore({
          id: String(qRec.id),
          assessmentId: record.assessmentId,
          sectionId: String(sRec.id),
          kind: qRec.kind as import('../../../domain/index.js').QuestionKind,
          title: String(qRec.title),
          prompt: asRecord(qRec.prompt),
          options: asArray(qRec.options).map((o) =>
            QuestionOption.create(
              o as unknown as import('../../../domain/index.js').QuestionOptionProps,
            ),
          ),
          ...(qRec.answerKey
            ? { answerKey: QuestionAnswerKey.create(asRecord(qRec.answerKey)) }
            : {}),
          points: QuestionPoints.create(Number(qRec.points)),
          gradingMode: qRec.gradingMode as import('../../../domain/index.js').GradingMode,
          position: Number(qRec.position),
          metadata: asRecord(qRec.metadata),
          createdAt: new Date(String(qRec.createdAt)),
          updatedAt: new Date(String(qRec.updatedAt)),
        });
      }),
      createdAt: new Date(String(sRec.createdAt)),
      updatedAt: new Date(String(sRec.updatedAt)),
    });
  });

  // Parsing loose questions from JSON
  const looseQuestionsData = asArray(record.looseQuestions);
  const looseQuestions = looseQuestionsData.map((q) => {
    const qRec = asRecord(q);
    return AssessmentQuestion.restore({
      id: String(qRec.id),
      assessmentId: record.assessmentId,
      kind: qRec.kind as import('../../../domain/index.js').QuestionKind,
      title: String(qRec.title),
      prompt: asRecord(qRec.prompt),
      options: asArray(qRec.options).map((o) =>
        QuestionOption.create(
          o as unknown as import('../../../domain/index.js').QuestionOptionProps,
        ),
      ),
      ...(qRec.answerKey ? { answerKey: QuestionAnswerKey.create(asRecord(qRec.answerKey)) } : {}),
      points: QuestionPoints.create(Number(qRec.points)),
      gradingMode: qRec.gradingMode as import('../../../domain/index.js').GradingMode,
      position: Number(qRec.position),
      metadata: asRecord(qRec.metadata),
      createdAt: new Date(String(qRec.createdAt)),
      updatedAt: new Date(String(qRec.updatedAt)),
    });
  });

  return AssessmentPublishedSnapshot.restore({
    id: record.id,
    assessmentId: record.assessmentId,
    versionId: record.versionId,
    versionNumber: record.versionNumber,
    sections,
    looseQuestions,
    publishedByPrincipalId: record.publishedByPrincipalId,
    publishedAt: record.publishedAt,
    createdAt: record.createdAt,
  });
}

export function toDomainAssessment(record: PersistenceAssessment): Assessment {
  return Assessment.restore({
    id: record.id,
    tenantId: record.tenantId,
    workspaceId: record.workspaceId,
    ownerPrincipalId: record.ownerPrincipalId,
    purpose: record.purpose as import('../../../domain/index.js').AssessmentPurpose,
    status: record.status as import('../../../domain/index.js').AssessmentStatus,
    visibility: record.visibility as import('../../../domain/index.js').AssessmentVisibility,
    title: record.title,
    ...(record.description !== null ? { description: record.description } : {}),
    attemptPolicy: AttemptPolicy.create(
      asRecord(
        record.attemptPolicy,
      ) as unknown as import('../../../domain/index.js').AttemptPolicyProps,
    ),
    timeLimit: TimeLimit.create(record.timeLimitMinutes ?? undefined),
    resultReleasePolicy:
      record.resultReleasePolicy as import('../../../domain/index.js').ResultReleasePolicy,
    metadata: asRecord(record.metadata),
    ...(record.currentDraftVersion
      ? { currentDraftVersion: toDomainVersion(record.currentDraftVersion) }
      : {}),
    ...(record.publishedSnapshot
      ? { publishedSnapshot: toDomainSnapshot(record.publishedSnapshot) }
      : {}),
    gradingRubrics: (record.gradingRubrics ?? []).map(toDomainRubric),
    gradingRules: (record.gradingRules ?? []).map(toDomainRule),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    ...(record.publishedAt !== null ? { publishedAt: record.publishedAt } : {}),
    ...(record.archivedAt !== null ? { archivedAt: record.archivedAt } : {}),
  });
}

export function toPersistenceAssessmentCreate(assessment: Assessment) {
  return {
    id: assessment.id,
    tenantId: assessment.tenantId,
    workspaceId: assessment.workspaceId,
    ownerPrincipalId: assessment.ownerPrincipalId,
    purpose: assessment.purpose,
    status: assessment.status,
    visibility: assessment.visibility,
    title: assessment.title,
    description: assessment.description ?? null,
    attemptPolicy: toInputJsonValue(assessment.attemptPolicy.toObject()),
    timeLimitMinutes: assessment.timeLimit.isTimed()
      ? (assessment.timeLimit.minutes() ?? null)
      : null,
    resultReleasePolicy: assessment.resultReleasePolicy,
    metadata: toInputJsonValue(assessment.metadata),
    createdAt: assessment.createdAt,
    updatedAt: assessment.updatedAt,
    publishedAt: assessment.publishedAt ?? null,
    archivedAt: assessment.archivedAt ?? null,
  };
}

export function toPersistenceAssessmentUpdate(assessment: Assessment) {
  return {
    purpose: assessment.purpose,
    status: assessment.status,
    visibility: assessment.visibility,
    title: assessment.title,
    description: assessment.description ?? null,
    attemptPolicy: toInputJsonValue(assessment.attemptPolicy.toObject()),
    timeLimitMinutes: assessment.timeLimit.isTimed()
      ? (assessment.timeLimit.minutes() ?? null)
      : null,
    resultReleasePolicy: assessment.resultReleasePolicy,
    metadata: toInputJsonValue(assessment.metadata),
    updatedAt: assessment.updatedAt,
    publishedAt: assessment.publishedAt ?? null,
    archivedAt: assessment.archivedAt ?? null,
  };
}

export function toPersistenceVersionCreate(version: AssessmentVersion) {
  return {
    id: version.id,
    assessmentId: version.assessmentId,
    versionNumber: version.versionNumber,
    status: version.status,
    createdByPrincipalId: version.createdByPrincipalId,
    createdAt: version.createdAt,
    publishedAt: version.publishedAt ?? null,
    supersededAt: version.supersededAt ?? null,
  };
}

export function toPersistenceSectionCreate(section: AssessmentSection, versionId: string) {
  return {
    id: section.id,
    assessmentId: section.assessmentId,
    versionId,
    title: section.title,
    description: section.description ?? null,
    position: section.position,
    metadata: toInputJsonValue(section.metadata),
    createdAt: section.createdAt,
    updatedAt: section.updatedAt,
  };
}

export function toPersistenceQuestionCreate(
  question: AssessmentQuestion,
  versionId: string,
  sectionIdOverride?: string,
) {
  return {
    id: question.id,
    assessmentId: question.assessmentId,
    versionId,
    sectionId: sectionIdOverride ?? question.sectionId ?? null,
    kind: question.kind,
    title: question.title,
    prompt: toInputJsonValue(question.prompt),
    options: toInputJsonValue(question.options.map(optionToPlain)),
    ...(question.answerKey ? { answerKey: toInputJsonValue(question.answerKey.toObject()) } : {}),
    points: question.points.value(),
    gradingMode: question.gradingMode,
    position: question.position,
    metadata: toInputJsonValue(question.metadata),
    createdAt: question.createdAt,
    updatedAt: question.updatedAt,
  };
}

export function toPersistenceRubricCreate(rubric: GradingRubric) {
  return {
    id: rubric.id,
    assessmentId: rubric.assessmentId,
    title: rubric.title,
    criteria: toInputJsonValue(rubric.criteria.map((c) => ({ ...c }))),
    createdAt: rubric.createdAt,
    updatedAt: rubric.updatedAt,
  };
}

export function toPersistenceRuleCreate(rule: GradingRule) {
  return {
    id: rule.id,
    assessmentId: rule.assessmentId,
    questionId: rule.questionId ?? null,
    mode: rule.mode,
    ruleType: rule.ruleType,
    config: toInputJsonValue(rule.config),
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
  };
}

export function toPersistenceSnapshotCreate(snapshot: AssessmentPublishedSnapshot) {
  return {
    id: snapshot.id,
    assessmentId: snapshot.assessmentId,
    versionId: snapshot.versionId,
    versionNumber: snapshot.versionNumber,
    sections: toInputJsonValue(
      snapshot.sections.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        position: s.position,
        metadata: s.metadata,
        questions: s.questions.map((q) => ({
          id: q.id,
          kind: q.kind,
          title: q.title,
          prompt: q.prompt,
          options: q.options.map(optionToPlain),
          answerKey: q.answerKey ? q.answerKey.toObject() : undefined,
          points: q.points.value(),
          gradingMode: q.gradingMode,
          position: q.position,
          metadata: q.metadata,
          createdAt: q.createdAt.toISOString(),
          updatedAt: q.updatedAt.toISOString(),
        })),
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
    ),
    looseQuestions: toInputJsonValue(
      snapshot.looseQuestions.map((q) => ({
        id: q.id,
        kind: q.kind,
        title: q.title,
        prompt: q.prompt,
        options: q.options.map(optionToPlain),
        answerKey: q.answerKey ? q.answerKey.toObject() : undefined,
        points: q.points.value(),
        gradingMode: q.gradingMode,
        position: q.position,
        metadata: q.metadata,
        createdAt: q.createdAt.toISOString(),
        updatedAt: q.updatedAt.toISOString(),
      })),
    ),
    publishedByPrincipalId: snapshot.publishedByPrincipalId,
    publishedAt: snapshot.publishedAt,
    createdAt: snapshot.createdAt,
  };
}

import { AssessmentPublishedSnapshot } from '../../domain/entities/index.js';
import { AssessmentPublishedSnapshotResponse } from '../dto/index.js';

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
      questions: s.questions.map((q) => ({
        id: q.id,
        sectionId: q.sectionId,
        kind: q.kind,
        title: q.title,
        prompt: { ...q.prompt },
        options: q.options.map((o) => ({ ...o })),
        answerKey: q.answerKey ? { ...q.answerKey } : undefined,
        points: q.points.value(),
        gradingMode: q.gradingMode,
        position: q.position,
        metadata: { ...q.metadata },
      })),
    })),
    looseQuestions: snapshot.looseQuestions.map((q) => ({
      id: q.id,
      sectionId: q.sectionId,
      kind: q.kind,
      title: q.title,
      prompt: { ...q.prompt },
      options: q.options.map((o) => ({ ...o })),
      answerKey: q.answerKey ? { ...q.answerKey } : undefined,
      points: q.points.value(),
      gradingMode: q.gradingMode,
      position: q.position,
      metadata: { ...q.metadata },
    })),
    publishedByPrincipalId: snapshot.publishedByPrincipalId,
    publishedAt: snapshot.publishedAt.toISOString(),
    createdAt: snapshot.createdAt.toISOString(),
  };
}

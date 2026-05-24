import type { AssessmentAttempt } from '../../../assessment-delivery/domain/entities/index.js';
import type {
  AssessmentAttemptGradingStatus,
  AssessmentAttemptStatus,
} from '../../../assessment-delivery/domain/value-objects/index.js';
import type { Assessment } from '../../../assessment-delivery/domain/entities/index.js';
import type {
  LearningAssessmentLink,
  LearningAssessmentUnlockPolicy,
} from '../../domain/entities/learning-assessment-link.entity.js';

export type LearnerLinkedAssessmentStatus =
  | 'NOT_STARTED'
  | 'AVAILABLE'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'AWAITING_GRADING'
  | 'RESULT_RELEASED'
  | 'PASSED'
  | 'FAILED'
  | 'UNAVAILABLE';

export interface LearnerLinkedAssessmentView {
  id: string;
  courseId: string;
  sectionId?: string | undefined;
  lessonId?: string | undefined;
  assessmentId: string;
  assessmentTitle?: string | undefined;
  required: boolean;
  position: number;
  unlockPolicy: LearningAssessmentUnlockPolicy;
  minimumScore?: number | undefined;
  status: LearnerLinkedAssessmentStatus;
  available: boolean;
  attemptId?: string | undefined;
  attemptStatus?: AssessmentAttemptStatus | undefined;
  gradingStatus?: AssessmentAttemptGradingStatus | undefined;
  resultReleased: boolean;
  releasedAt?: string | undefined;
  score?: number | undefined;
  maxScore?: number | undefined;
  passed?: boolean | undefined;
  blockingCompletion: boolean;
  unavailableReason?: string | undefined;
}

export interface LearningAssessmentCompletionSummary {
  totalLinkedAssessments: number;
  requiredAssessments: number;
  completedRequiredAssessments: number;
  blockedRequiredAssessments: number;
  canCompleteCourse: boolean;
}

export class LearningAssessmentLinkPolicyService {
  isUnlocked(link: LearningAssessmentLink, lessonProgressCompleted: boolean): boolean {
    if (link.unlockPolicy === 'IMMEDIATE') {
      return true;
    }

    return lessonProgressCompleted;
  }

  isAssessmentPublished(assessment?: Assessment | null): boolean {
    return Boolean(assessment && assessment.status === 'PUBLISHED');
  }

  isRequiredAssessmentSatisfied(input: {
    link: LearningAssessmentLink;
    attempt?: AssessmentAttempt | null | undefined;
  }): boolean {
    const { link, attempt } = input;

    if (!attempt) {
      return false;
    }

    if (link.minimumScore !== undefined) {
      return Boolean(
        attempt.result &&
        attempt.result.releasedAt !== undefined &&
        attempt.result.score !== undefined &&
        attempt.result.score.value >= link.minimumScore,
      );
    }

    if (attempt.status === 'SUBMITTED') {
      return true;
    }

    return Boolean(
      attempt.result &&
      attempt.result.releasedAt !== undefined &&
      (attempt.result.gradingStatus === 'RELEASED' || attempt.result.gradingStatus === 'GRADED'),
    );
  }

  toLearnerView(input: {
    link: LearningAssessmentLink;
    assessment?: Assessment | null;
    attempt?: AssessmentAttempt | null;
    lessonProgressCompleted: boolean;
  }): LearnerLinkedAssessmentView {
    const { link, assessment, attempt, lessonProgressCompleted } = input;
    const published = this.isAssessmentPublished(assessment);
    const unlocked = this.isUnlocked(link, lessonProgressCompleted);
    const attemptResult = attempt?.result;
    const released = Boolean(attemptResult?.releasedAt);
    const score =
      released && attemptResult?.score !== undefined ? attemptResult.score.value : undefined;
    const maxScore =
      released && attemptResult?.maxScore !== undefined ? attemptResult.maxScore.value : undefined;
    const passed =
      released && link.minimumScore !== undefined && score !== undefined
        ? score >= link.minimumScore
        : undefined;

    let status: LearnerLinkedAssessmentStatus = 'UNAVAILABLE';
    let available = false;
    let unavailableReason: string | undefined;

    if (!published) {
      unavailableReason = 'Assessment is unavailable';
    } else if (!unlocked) {
      status = 'NOT_STARTED';
      unavailableReason = 'Complete the lesson to unlock this assessment';
    } else if (!attempt) {
      status = 'AVAILABLE';
      available = true;
    } else if (attempt.status === 'IN_PROGRESS') {
      status = 'IN_PROGRESS';
      available = true;
    } else if (attempt.status === 'SUBMITTED') {
      if (attemptResult?.gradingStatus === 'RELEASED' && released) {
        status =
          link.minimumScore !== undefined ? (passed ? 'PASSED' : 'FAILED') : 'RESULT_RELEASED';
      } else if (
        attemptResult?.gradingStatus === 'GRADED' ||
        attemptResult?.gradingStatus === 'PENDING_MANUAL_REVIEW' ||
        attemptResult?.gradingStatus === 'AUTO_GRADING_RESERVED' ||
        attemptResult?.gradingStatus === 'NOT_GRADED'
      ) {
        status = 'AWAITING_GRADING';
      } else {
        status = 'SUBMITTED';
      }
      available = true;
    } else if (attempt.status === 'EXPIRED' || attempt.status === 'CANCELLED') {
      status = 'AVAILABLE';
      available = true;
    }

    return {
      id: link.id,
      courseId: link.courseId,
      ...(link.sectionId !== undefined ? { sectionId: link.sectionId } : {}),
      ...(link.lessonId !== undefined ? { lessonId: link.lessonId } : {}),
      assessmentId: link.assessmentId,
      ...(published && assessment?.title ? { assessmentTitle: assessment.title } : {}),
      required: link.required,
      position: link.position,
      unlockPolicy: link.unlockPolicy,
      ...(link.minimumScore !== undefined ? { minimumScore: link.minimumScore } : {}),
      status,
      available,
      ...(attempt?.id !== undefined ? { attemptId: attempt.id } : {}),
      ...(attempt?.status !== undefined ? { attemptStatus: attempt.status } : {}),
      ...(attemptResult?.gradingStatus !== undefined
        ? { gradingStatus: attemptResult.gradingStatus }
        : {}),
      resultReleased: released,
      ...(attemptResult?.releasedAt !== undefined
        ? { releasedAt: attemptResult.releasedAt.toISOString() }
        : {}),
      ...(score !== undefined ? { score } : {}),
      ...(maxScore !== undefined ? { maxScore } : {}),
      ...(passed !== undefined ? { passed } : {}),
      blockingCompletion: link.required && !this.isRequiredAssessmentSatisfied({ link, attempt }),
      ...(unavailableReason ? { unavailableReason } : {}),
    };
  }

  summarize(input: {
    links: LearningAssessmentLink[];
    attemptsByLinkId: Map<string, AssessmentAttempt | null>;
    lessonProgressCompletedByLessonId: Map<string, boolean>;
    assessmentById: Map<string, Assessment | null>;
  }): LearningAssessmentCompletionSummary {
    let totalLinkedAssessments = 0;
    let requiredAssessments = 0;
    let completedRequiredAssessments = 0;
    let blockedRequiredAssessments = 0;

    for (const link of input.links) {
      totalLinkedAssessments += 1;
      if (link.required) {
        requiredAssessments += 1;
      }
      const lessonCompleted = link.lessonId
        ? Boolean(input.lessonProgressCompletedByLessonId.get(link.lessonId))
        : true;
      const attempt = input.attemptsByLinkId.get(link.id) ?? null;
      const satisfied =
        this.isAssessmentPublished(input.assessmentById.get(link.assessmentId)) &&
        this.isUnlocked(link, lessonCompleted) &&
        this.isRequiredAssessmentSatisfied({ link, attempt });
      if (link.required && satisfied) {
        completedRequiredAssessments += 1;
      }
      if (link.required && !satisfied) {
        blockedRequiredAssessments += 1;
      }
    }

    return {
      totalLinkedAssessments,
      requiredAssessments,
      completedRequiredAssessments,
      blockedRequiredAssessments,
      canCompleteCourse: blockedRequiredAssessments === 0,
    };
  }
}

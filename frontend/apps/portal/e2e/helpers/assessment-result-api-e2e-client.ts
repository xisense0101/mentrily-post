import type {
  AssessmentInstructorResultContract,
  AssessmentLearnerResultContract,
  AssessmentAttemptContract,
  AssessmentGradingRunContract,
  CreateAssessmentRequest,
} from '../../src/contracts/assessment-delivery';
import type { E2ERequestContextHeaders } from '../../src/foundation/e2e/e2e-request-context';
import { createAssessmentResultFixture } from './assessment-result-e2e-data';

const DEFAULT_API_URL = 'http://localhost:3001';
function base() {
  return (
    process.env.PLATFORM_API_URL ??
    process.env.NEXT_PUBLIC_PLATFORM_API_URL ??
    DEFAULT_API_URL
  ).replace(/\/$/, '');
}
async function request<T>(
  label: string,
  path: string,
  context: E2ERequestContextHeaders,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${base()}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      'x-request-id': context.requestId,
      'x-correlation-id': context.correlationId,
      'x-tenant-id': context.tenantId,
      'x-workspace-id': context.workspaceId,
      'x-actor-id': context.actorId,
    },
  });
  if (!response.ok)
    throw new Error(`${label} failed (${response.status}): ${await response.text()}`);
  return (await response.json()) as T;
}

export async function setupReleasedAssessmentResult(input: {
  creatorContext: E2ERequestContextHeaders;
  learnerContext: E2ERequestContextHeaders;
  assessmentInput: CreateAssessmentRequest;
  release?: boolean;
}) {
  const assessment = await request<{ id: string }>(
    'create assessment',
    '/workspace/assessments',
    input.creatorContext,
    { method: 'POST', body: JSON.stringify(input.assessmentInput) },
  );
  const fixture = createAssessmentResultFixture();
  await request(
    'replace content',
    `/workspace/assessments/${assessment.id}/content`,
    input.creatorContext,
    { method: 'PUT', body: JSON.stringify(fixture.content) },
  );
  await request(
    'publish assessment',
    `/workspace/assessments/${assessment.id}/publish`,
    input.creatorContext,
    { method: 'POST', body: JSON.stringify({}) },
  );
  const attempt = await request<AssessmentAttemptContract>(
    'start attempt',
    `/workspace/assessments/${assessment.id}/attempts`,
    input.learnerContext,
    { method: 'POST', body: JSON.stringify({}) },
  );
  await request(
    'save mcq answer',
    `/workspace/assessment-attempts/${attempt.id}/answers/${fixture.ids.mcqQuestionId}`,
    input.learnerContext,
    {
      method: 'PUT',
      body: JSON.stringify({
        questionId: fixture.ids.mcqQuestionId,
        questionKind: 'MCQ',
        answer: { selectedOptionId: fixture.ids.optionAId },
      }),
    },
  );
  await request(
    'save long answer',
    `/workspace/assessment-attempts/${attempt.id}/answers/${fixture.ids.longQuestionId}`,
    input.learnerContext,
    {
      method: 'PUT',
      body: JSON.stringify({
        questionId: fixture.ids.longQuestionId,
        questionKind: 'LONG_ANSWER',
        answer: { text: 'Long response' },
      }),
    },
  );
  const submitted = await request<AssessmentAttemptContract>(
    'submit attempt',
    `/workspace/assessment-attempts/${attempt.id}/submit`,
    input.learnerContext,
    { method: 'POST', body: JSON.stringify({}) },
  );
  const gradingRun = await request<AssessmentGradingRunContract>(
    'grade attempt',
    `/workspace/assessment-attempts/${attempt.id}/grade`,
    input.creatorContext,
    { method: 'POST', body: JSON.stringify({}) },
  );
  const pending = gradingRun.answerGrades.find((grade) => grade.status === 'PENDING_MANUAL_REVIEW');
  if (pending) {
    await request<AssessmentGradingRunContract>(
      'manual grade answer',
      `/workspace/assessment-grading-runs/${gradingRun.id}/answers/${pending.answerId}/manual-grade`,
      input.creatorContext,
      { method: 'POST', body: JSON.stringify({ score: 3, feedback: { note: 'Complete answer' } }) },
    );
  }
  const instructorResultBeforeRelease = await request<AssessmentInstructorResultContract>(
    'get instructor result before release',
    `/workspace/assessment-attempts/${attempt.id}/results/instructor`,
    input.creatorContext,
  );
  const released =
    input.release === false
      ? undefined
      : await request<AssessmentInstructorResultContract>(
          'release result',
          `/workspace/assessment-attempts/${attempt.id}/results/release`,
          input.creatorContext,
          { method: 'POST', body: JSON.stringify({}) },
        );
  return {
    assessmentId: assessment.id,
    attempt: submitted,
    instructorResultBeforeRelease,
    released,
  };
}

export function getLearnerResult(context: E2ERequestContextHeaders, attemptId: string) {
  return request<AssessmentLearnerResultContract>(
    'get learner result',
    `/workspace/assessment-attempts/${attemptId}/results/me`,
    context,
  );
}

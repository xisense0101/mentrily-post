import type {
  AssessmentAttemptContract,
  AssessmentGradingRunContract,
  CreateAssessmentRequest,
  ReplaceAssessmentContentRequest,
} from '../../src/contracts/assessment-delivery';
import type { E2ERequestContextHeaders } from '../../src/foundation/e2e/e2e-request-context';

const DEFAULT_API_URL = 'http://localhost:3001';

function base() {
  return (
    process.env.PLATFORM_API_URL ??
    process.env.NEXT_PUBLIC_PLATFORM_API_URL ??
    DEFAULT_API_URL
  ).replace(/\/$/, '');
}

async function request<T>(
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
  if (!response.ok) {
    throw new Error(`Grading API E2E failed (${response.status}): ${await response.text()}`);
  }
  return (await response.json()) as T;
}

export async function createPublishAttemptAndGrade(input: {
  creatorContext: E2ERequestContextHeaders;
  learnerContext: E2ERequestContextHeaders;
  assessmentInput: CreateAssessmentRequest;
  content: ReplaceAssessmentContentRequest;
}): Promise<{
  attempt: AssessmentAttemptContract;
  gradingRun: AssessmentGradingRunContract;
  longQuestionId: string;
}> {
  const assessment = await request<{ id: string }>('/workspace/assessments', input.creatorContext, {
    method: 'POST',
    body: JSON.stringify(input.assessmentInput),
  });
  await request(`/workspace/assessments/${assessment.id}/content`, input.creatorContext, {
    method: 'PUT',
    body: JSON.stringify(input.content),
  });
  await request(`/workspace/assessments/${assessment.id}/publish`, input.creatorContext, {
    method: 'POST',
    body: JSON.stringify({}),
  });

  const attempt = await request<AssessmentAttemptContract>(
    `/workspace/assessments/${assessment.id}/attempts`,
    input.learnerContext,
    { method: 'POST', body: JSON.stringify({}) },
  );
  const mcq = input.content.looseQuestions[0]!;
  const long = input.content.looseQuestions[1]!;

  await request(
    `/workspace/assessment-attempts/${attempt.id}/answers/${mcq.id}`,
    input.learnerContext,
    {
      method: 'PUT',
      body: JSON.stringify({
        questionId: mcq.id,
        questionKind: 'MCQ',
        answer: { selectedOptionId: 'o1' },
      }),
    },
  );
  await request(
    `/workspace/assessment-attempts/${attempt.id}/answers/${long.id}`,
    input.learnerContext,
    {
      method: 'PUT',
      body: JSON.stringify({
        questionId: long.id,
        questionKind: 'LONG_ANSWER',
        answer: { text: 'Long response' },
      }),
    },
  );

  const submitted = await request<AssessmentAttemptContract>(
    `/workspace/assessment-attempts/${attempt.id}/submit`,
    input.learnerContext,
    { method: 'POST', body: JSON.stringify({}) },
  );
  const gradingRun = await request<AssessmentGradingRunContract>(
    `/workspace/assessment-attempts/${attempt.id}/grade`,
    input.creatorContext,
    { method: 'POST', body: JSON.stringify({}) },
  );

  return { attempt: submitted, gradingRun, longQuestionId: long.id };
}

export async function getManualReviewQueue(
  context: E2ERequestContextHeaders,
): Promise<{ items: Array<{ gradingRunId: string; answerId: string; status: string }> }> {
  return request('/workspace/assessment-grading/manual-review', context);
}

export async function manualGrade(
  context: E2ERequestContextHeaders,
  gradingRunId: string,
  answerId: string,
  score: number,
): Promise<AssessmentGradingRunContract> {
  return request(
    `/workspace/assessment-grading-runs/${gradingRunId}/answers/${answerId}/manual-grade`,
    context,
    {
      method: 'POST',
      body: JSON.stringify({ score, feedback: { note: 'Reviewed manually' } }),
    },
  );
}

export async function getAttempt(
  context: E2ERequestContextHeaders,
  attemptId: string,
): Promise<AssessmentAttemptContract> {
  return request(`/workspace/assessment-attempts/${attemptId}`, context);
}

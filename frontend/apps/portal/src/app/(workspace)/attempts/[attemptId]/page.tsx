import { AssessmentAttemptRunnerPage } from '../../../../modules/assessment-attempts/routes';

export default async function AttemptDetailRoute({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;

  return <AssessmentAttemptRunnerPage attemptId={attemptId} />;
}

import { LearnerResultPage } from '@/modules/assessment-results';

export default async function AttemptResultRoute({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  return <LearnerResultPage attemptId={attemptId} />;
}

import { InstructorResultPage } from '@/modules/assessment-results';

export default async function GradingResultRoute({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  return <InstructorResultPage attemptId={attemptId} />;
}

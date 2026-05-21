import { GradingRunPage } from '@/modules/assessment-grading';

export default async function GradingRunRoute({
  params,
}: {
  params: Promise<{ gradingRunId: string }>;
}) {
  const { gradingRunId } = await params;
  return <GradingRunPage gradingRunId={gradingRunId} />;
}

import { AttemptMonitoringPage } from '@/modules/proctoring/routes/attempt-monitoring-page';

export default async function GradingResultMonitoringRoute({
  params,
  searchParams,
}: {
  params: Promise<{ attemptId: string }>;
  searchParams: Promise<{ assessmentId?: string }>;
}) {
  const { attemptId } = await params;
  const { assessmentId = '' } = await searchParams;

  return <AttemptMonitoringPage attemptId={attemptId} assessmentId={assessmentId} />;
}

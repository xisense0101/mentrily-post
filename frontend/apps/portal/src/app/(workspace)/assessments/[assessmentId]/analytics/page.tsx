import { CodingAssessmentAnalyticsView } from '@/modules/assessment-analytics';

interface AssessmentAnalyticsRouteProps {
  params: Promise<{ assessmentId: string }>;
}

export default async function AssessmentAnalyticsRoute({ params }: AssessmentAnalyticsRouteProps) {
  const { assessmentId } = await params;

  return <CodingAssessmentAnalyticsView assessmentId={assessmentId} />;
}

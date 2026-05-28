import { AssessmentSecuritySettingsPage } from '@/modules/assessment-builder/routes';

interface AssessmentSecurityRouteProps {
  params: Promise<{ assessmentId: string }>;
}

export default async function AssessmentSecurityRoute({ params }: AssessmentSecurityRouteProps) {
  const { assessmentId } = await params;
  return <AssessmentSecuritySettingsPage assessmentId={assessmentId} />;
}

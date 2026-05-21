import { AssessmentEditorPage } from '@/modules/assessment-builder/routes';

interface AssessmentEditorRouteProps {
  params: Promise<{ assessmentId: string }>;
}

export default async function AssessmentEditorRoute({ params }: AssessmentEditorRouteProps) {
  const { assessmentId } = await params;

  return <AssessmentEditorPage assessmentId={assessmentId} />;
}

import { AssessmentAttemptStartPage } from '../../../../../modules/assessment-attempts/routes';

export default async function AssessmentAttemptStartRoute({
  params,
}: {
  params: Promise<{ assessmentId: string }>;
}) {
  const { assessmentId } = await params;

  return <AssessmentAttemptStartPage assessmentId={assessmentId} />;
}

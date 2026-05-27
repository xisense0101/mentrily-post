import { ProctoringIncidentDetailPage } from '@/modules/proctoring/routes/proctoring-incident-detail-page';

interface Props {
  params: Promise<{ incidentId: string }>;
}

export default async function ProctoringIncidentDetailRoute({ params }: Props) {
  const { incidentId } = await params;
  return <ProctoringIncidentDetailPage incidentId={incidentId} />;
}

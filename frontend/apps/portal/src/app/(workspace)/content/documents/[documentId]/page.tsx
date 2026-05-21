import { ContentDocumentEditorPage } from '@/modules/content-studio/routes';

interface ContentDocumentEditorRouteProps {
  params: Promise<{
    documentId: string;
  }>;
}

export default async function ContentDocumentEditorRoute({
  params,
}: ContentDocumentEditorRouteProps) {
  const { documentId } = await params;
  return <ContentDocumentEditorPage documentId={documentId} />;
}

import { Badge } from '@mentrily/ui-system';
import type { ContentDocumentStatusContract } from '../../types';

interface ContentDocumentStatusBadgeProps {
  status: ContentDocumentStatusContract | string;
}

export function ContentDocumentStatusBadge({
  status,
}: ContentDocumentStatusBadgeProps) {
  const tone =
    status === 'PUBLISHED'
      ? 'success'
      : status === 'ARCHIVED'
        ? 'danger'
        : status === 'DRAFT'
          ? 'warning'
          : 'neutral';

  return <Badge tone={tone}>{status}</Badge>;
}

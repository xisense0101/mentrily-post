import { Card } from '@mentrily/ui-system';
import type { ContentDocumentContract } from '../../types';
import { ContentDocumentStatusBadge } from './content-document-status-badge';
import { ContentPurposeBadge } from './content-purpose-badge';

interface ContentDocumentCardProps {
  document: ContentDocumentContract;
  href?: string;
  onOpen?: () => void;
}

function formatDate(value?: string): string {
  if (!value) {
    return 'Not available';
  }

  return new Date(value).toLocaleString();
}

export function ContentDocumentCard({ document, href, onOpen }: ContentDocumentCardProps) {
  const blockCount = document.currentDraftVersion?.blocks.length ?? 0;

  const content = (
    <div data-testid="content-document-card">
      <Card className="transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-portal-lg">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">{document.title}</h3>
            <p className="mt-1 text-sm text-slate-500">Updated {formatDate(document.updatedAt)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ContentDocumentStatusBadge status={document.status} />
            <ContentPurposeBadge purpose={document.purpose} />
          </div>
        </div>
        <div className="mt-4 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
          <p>{blockCount} draft blocks</p>
          <p>Published {formatDate(document.publishedAt)}</p>
          <p>Archived {formatDate(document.archivedAt)}</p>
        </div>
      </Card>
    </div>
  );

  if (href) {
    return (
      <a
        className="block rounded-[1.75rem] focus-visible:outline-none"
        data-testid="content-document-open-link"
        href={href}
        onClick={onOpen}
      >
        {content}
      </a>
    );
  }

  return <div onClick={onOpen}>{content}</div>;
}

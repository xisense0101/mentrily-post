import { Card } from '@mentrily/ui-system';
import type { ContentDocumentContract } from '../../types';

interface ContentPublishPanelProps {
  document: ContentDocumentContract;
  blockCount: number;
}

export function ContentPublishPanel({ document, blockCount }: ContentPublishPanelProps) {
  const latestPublishedAt = document.publishedSnapshot?.publishedAt ?? document.publishedAt ?? null;

  return (
    <Card className="rounded-[2rem]" data-testid="content-publish-panel">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-slate-900">Publish readiness</h3>
        <p className="text-sm text-slate-600">
          Draft status stays local until you save blocks. Publishing creates the latest durable
          snapshot through the backend API.
        </p>
        <p className="text-sm text-slate-600">Draft blocks: {blockCount}</p>
        <p className="text-sm text-slate-600">
          Latest published timestamp: {latestPublishedAt ?? 'Not published yet'}
        </p>
        {blockCount === 0 ? (
          <p className="text-sm text-amber-700">
            This draft has no blocks yet. Publishing is allowed by the backend, but usually not
            useful.
          </p>
        ) : null}
      </div>
    </Card>
  );
}

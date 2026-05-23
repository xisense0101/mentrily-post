import type { MediaAsset } from '../../domain/entities/media-asset.entity.js';
import {
  SYSTEM_MEDIA_PROCESSING_TEMPLATES,
  templateFallbackForCategory,
} from './media-processing-template.registry.js';
import type { MediaProcessingTemplateDefinition } from './media-processing-template.types.js';

export function resolveMediaProcessingTemplate(
  asset: MediaAsset,
): MediaProcessingTemplateDefinition {
  const byMimeType = SYSTEM_MEDIA_PROCESSING_TEMPLATES.find((template) =>
    template.mimeTypePrefixes.some((prefix) => asset.contentType.startsWith(prefix)),
  );

  return byMimeType ?? templateFallbackForCategory(asset.fileCategory);
}

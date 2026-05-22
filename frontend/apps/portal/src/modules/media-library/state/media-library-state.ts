import type {
  MediaAssetContract,
  MediaFileCategoryContract,
  MediaUploadQueueItem,
} from '../types';

function inferFromExtension(name: string): MediaFileCategoryContract {
  const extension = name.toLowerCase().split('.').pop() ?? '';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension)) return 'IMAGE';
  if (['mp4', 'mov', 'avi', 'webm'].includes(extension)) return 'VIDEO';
  if (['mp3', 'wav', 'ogg', 'm4a'].includes(extension)) return 'AUDIO';
  if (['zip', 'rar', 'tar', 'gz', '7z'].includes(extension)) return 'ARCHIVE';
  if (['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'md'].includes(extension)) {
    return 'DOCUMENT';
  }

  return 'OTHER';
}

export function inferMediaFileCategory(input: {
  file: Pick<File, 'type' | 'name'>;
}): MediaFileCategoryContract {
  const mime = input.file.type.toLowerCase();
  if (mime.startsWith('image/')) return 'IMAGE';
  if (mime.startsWith('video/')) return 'VIDEO';
  if (mime.startsWith('audio/')) return 'AUDIO';
  if (
    mime.includes('pdf') ||
    mime.includes('document') ||
    mime.includes('spreadsheet') ||
    mime.includes('presentation') ||
    mime.startsWith('text/')
  ) {
    return 'DOCUMENT';
  }
  if (mime.includes('zip') || mime.includes('compressed') || mime.includes('archive')) return 'ARCHIVE';

  return inferFromExtension(input.file.name);
}

export function formatMediaFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
}

export function validateMediaFileForUpload(input: {
  file: Pick<File, 'name' | 'size' | 'type'>;
  maxSizeBytes?: number;
  allowedCategories?: MediaFileCategoryContract[];
}): {
  valid: boolean;
  message?: string;
  fileCategory?: MediaFileCategoryContract;
} {
  const fileCategory = inferMediaFileCategory({ file: input.file });
  if (input.maxSizeBytes && input.file.size > input.maxSizeBytes) {
    return {
      valid: false,
      message: `File exceeds the ${formatMediaFileSize(input.maxSizeBytes)} limit.`,
      fileCategory,
    };
  }

  if (input.allowedCategories && !input.allowedCategories.includes(fileCategory)) {
    return {
      valid: false,
      message: `Files in category ${fileCategory.toLowerCase()} are not allowed here.`,
      fileCategory,
    };
  }

  return { valid: true, fileCategory };
}

export function isPreviewableMediaAsset(asset: MediaAssetContract): boolean {
  if (asset.status !== 'AVAILABLE' || asset.archivedAt) return false;
  return ['IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'OTHER', 'ARCHIVE'].includes(asset.fileCategory);
}

export function getMediaAssetDisplayName(asset: MediaAssetContract): string {
  return asset.filename || asset.id;
}

export function createUploadQueueItem(file: File): MediaUploadQueueItem {
  return {
    id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
    file,
    fileCategory: inferMediaFileCategory({ file }),
    status: 'PENDING',
    progress: { loadedBytes: 0, totalBytes: file.size, percent: 0 },
  };
}

export function updateUploadQueueItemProgress(input: {
  item: MediaUploadQueueItem;
  loadedBytes: number;
  totalBytes: number;
}): MediaUploadQueueItem {
  const totalBytes = input.totalBytes || input.item.file.size;
  const percent = totalBytes > 0 ? Math.min(100, Math.round((input.loadedBytes / totalBytes) * 100)) : 0;
  return {
    ...input.item,
    progress: {
      loadedBytes: input.loadedBytes,
      totalBytes,
      percent,
    },
  };
}

import { Injectable } from '@nestjs/common';
import { AppError } from '@mentrily/service-core';
import type { MediaFileCategory } from '../value-objects/index.js';
import { assertMediaContentType } from '../value-objects/index.js';

const MAX_SIZE_BYTES: Record<MediaFileCategory, number> = {
  DOCUMENT: 25 * 1024 * 1024,
  IMAGE: 10 * 1024 * 1024,
  VIDEO: 250 * 1024 * 1024,
  AUDIO: 100 * 1024 * 1024,
  ARCHIVE: 50 * 1024 * 1024,
  OTHER: 10 * 1024 * 1024,
};

@Injectable()
export class MediaUploadPolicyService {
  validateFilename(filename: string): string {
    const trimmed = filename.trim();
    if (!trimmed || trimmed.includes('/') || trimmed.includes('\\') || trimmed.includes('..')) {
      throw new AppError('VALIDATION_ERROR', 'invalid media filename', 400);
    }

    return trimmed;
  }

  validateContentType(contentType: string): string {
    const normalized = assertMediaContentType(contentType);
    if (
      normalized.includes('javascript') ||
      normalized.includes('x-msdownload') ||
      normalized.includes('x-sh') ||
      normalized.includes('x-bat')
    ) {
      throw new AppError('VALIDATION_ERROR', 'unsafe media content type', 400);
    }

    return normalized;
  }

  validateFileCategory(category: MediaFileCategory): MediaFileCategory {
    return category;
  }

  validateMaxSize(category: MediaFileCategory, sizeBytes: number): number {
    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
      throw new AppError('VALIDATION_ERROR', 'invalid media max size', 400);
    }

    const limit = MAX_SIZE_BYTES[category];
    if (sizeBytes > limit) {
      throw new AppError('VALIDATION_ERROR', 'media file exceeds allowed size', 400, {
        category,
        maxSizeBytes: limit,
      });
    }

    return sizeBytes;
  }

  calculateUploadIntentExpiry(now = new Date()): Date {
    return new Date(now.getTime() + 15 * 60 * 1000);
  }
}

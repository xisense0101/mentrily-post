import { AppError } from '@mentrily/service-core';

export function assertMediaContentType(value: string): string {
  const contentType = value.trim().toLowerCase();
  if (!contentType || !contentType.includes('/')) {
    throw new AppError('VALIDATION_ERROR', 'invalid media content type', 400);
  }

  return contentType;
}

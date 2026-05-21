import { AppError } from '@mentrily/service-core';

export function assertMediaObjectKey(value: string, tenantId: string, workspaceId: string): string {
  const objectKey = value.trim();
  if (!objectKey || objectKey.startsWith('/') || objectKey.includes('..')) {
    throw new AppError('VALIDATION_ERROR', 'invalid media object key', 400);
  }

  const prefix = `tenants/${tenantId}/workspaces/${workspaceId}/media/`;
  if (!objectKey.startsWith(prefix)) {
    throw new AppError('VALIDATION_ERROR', 'media object key must be workspace scoped', 400);
  }

  return objectKey;
}

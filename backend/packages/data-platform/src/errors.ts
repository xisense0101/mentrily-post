import { Prisma } from '@prisma/client';

export enum DataErrorType {
  UNIQUE_VIOLATION = 'UNIQUE_VIOLATION',
  NOT_FOUND = 'NOT_FOUND',
  FOREIGN_KEY_VIOLATION = 'FOREIGN_KEY_VIOLATION',
  UNKNOWN = 'UNKNOWN',
}

export class DataError extends Error {
  constructor(
    public readonly type: DataErrorType,
    message: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = 'DataError';
  }
}

export function mapPrismaError(error: unknown): Error {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return new DataError(DataErrorType.UNIQUE_VIOLATION, 'Unique constraint violation', error);
      case 'P2025':
        return new DataError(DataErrorType.NOT_FOUND, 'Record not found', error);
      case 'P2003':
        return new DataError(DataErrorType.FOREIGN_KEY_VIOLATION, 'Foreign key constraint violation', error);
      default:
        return new DataError(DataErrorType.UNKNOWN, `Prisma error: ${error.code}`, error);
    }
  }
  return error instanceof Error ? error : new Error(String(error));
}

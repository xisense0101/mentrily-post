import { describe, expect, it } from 'vitest';
import { AppError, toErrorEnvelope } from '../errors.js';

describe('toErrorEnvelope', () => {
  it('maps AppError into typed error envelope', () => {
    const error = new AppError('FORBIDDEN', 'Access denied.', 403, { scope: 'workspace' });

    expect(toErrorEnvelope(error, 'req-1')).toEqual({
      error: {
        code: 'FORBIDDEN',
        message: 'Access denied.',
        requestId: 'req-1',
        details: { scope: 'workspace' },
      },
    });
  });

  it('maps unknown errors to internal error envelope', () => {
    expect(toErrorEnvelope(new Error('boom'), 'req-2')).toEqual({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred.',
        requestId: 'req-2',
      },
    });
  });
});

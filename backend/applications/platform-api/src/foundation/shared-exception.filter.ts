import {
  ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AppError, toErrorEnvelope } from '@mentrily/service-core';
import type { FastifyReply, FastifyRequest } from 'fastify';

@Catch()
export class SharedExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<FastifyReply>();
    const request = http.getRequest<FastifyRequest>();

    const requestId = request.requestContext?.requestId;
    const statusCode = this.resolveStatusCode(exception);
    const appError = this.toAppError(exception, statusCode);

    response.status(statusCode).send(toErrorEnvelope(appError, requestId));
  }

  private resolveStatusCode(exception: unknown): number {
    if (exception instanceof AppError) {
      return exception.statusCode;
    }

    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private toAppError(exception: unknown, statusCode: number): AppError {
    if (exception instanceof AppError) {
      return exception;
    }

    if (exception instanceof HttpException) {
      const message = this.readHttpMessage(exception);

      return new AppError(this.toErrorCode(statusCode), message, statusCode);
    }

    return new AppError('INTERNAL_ERROR', 'An unexpected error occurred.', statusCode);
  }

  private readHttpMessage(exception: HttpException): string {
    const response = exception.getResponse();

    if (typeof response === 'string') {
      return response;
    }

    if (typeof response === 'object' && response && 'message' in response) {
      const message = (response as { message?: unknown }).message;

      if (Array.isArray(message)) {
        return message.join(', ');
      }

      if (typeof message === 'string') {
        return message;
      }
    }

    return exception.message;
  }

  private toErrorCode(statusCode: number): AppError['code'] {
    switch (statusCode) {
      case HttpStatus.BAD_REQUEST:
        return 'VALIDATION_ERROR';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'RATE_LIMITED';
      case HttpStatus.SERVICE_UNAVAILABLE:
        return 'SERVICE_UNAVAILABLE';
      default:
        return 'INTERNAL_ERROR';
    }
  }
}

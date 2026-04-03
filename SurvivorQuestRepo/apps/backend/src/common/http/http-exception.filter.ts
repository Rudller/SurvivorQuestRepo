import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ApiErrorBody, ApiErrorCode } from './api-error';

function toErrorCode(statusCode: number): ApiErrorCode {
  if (statusCode === 400) return 'bad_request';
  if (statusCode === 401) return 'unauthorized';
  if (statusCode === 403) return 'forbidden';
  if (statusCode === 404) return 'not_found';
  if (statusCode === 409) return 'conflict';
  return 'internal_server_error';
}

function normalizeMessage(payload: unknown, fallback: string) {
  if (typeof payload === 'string' && payload.trim()) {
    return payload;
  }

  if (
    payload &&
    typeof payload === 'object' &&
    'message' in payload &&
    typeof payload.message === 'string' &&
    payload.message.trim()
  ) {
    return payload.message;
  }

  return fallback;
}

function extractDetails(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }

  if ('details' in payload) {
    return payload.details;
  }

  if ('message' in payload && Array.isArray(payload.message)) {
    return payload.message as unknown[];
  }

  return undefined;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionBody =
      exception instanceof HttpException ? exception.getResponse() : undefined;

    const body: ApiErrorBody = {
      success: false,
      error: {
        code: toErrorCode(statusCode),
        message: normalizeMessage(exceptionBody, 'Internal server error'),
        details: extractDetails(exceptionBody),
      },
      meta: {
        statusCode,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    };

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Unhandled non-Error exception';
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(
        `${request.method} ${request.url} -> ${statusCode}: ${message}`,
        stack,
      );
    }

    response.status(statusCode).json(body);
  }
}

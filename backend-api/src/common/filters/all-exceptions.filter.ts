import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiResponseFactory } from '../api-response.util';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'message' in exceptionResponse
      ) {
        const resMessage = (exceptionResponse as Record<string, unknown>).message;
        message = Array.isArray(resMessage) ? resMessage[0] : String(resMessage);
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      const msg = exception.message || String(exception);
      message = msg === '[object Object]' || !msg ? JSON.stringify(exception) : msg;
    } else {
      message = typeof exception === 'object' ? JSON.stringify(exception) : String(exception);
    }

    response.status(status).json(ApiResponseFactory.error(message));
  }
}

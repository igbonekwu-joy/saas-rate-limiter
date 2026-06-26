import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { RateLimitException } from '../exceptions/rate-limit.exception';

@Catch(RateLimitException)
export class RateLimitFilter implements ExceptionFilter {
  catch(exception: RateLimitException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const body = exception.getResponse() as any;

    response
      .status(HttpStatus.TOO_MANY_REQUESTS)
      .set({
        'X-RateLimit-Limit':     String(body.limit),
        'X-RateLimit-Remaining': String(body.remaining),
        'X-RateLimit-Reset':     String(Math.floor(new Date(body.resetAt).getTime() / 1000)),
        'Retry-After':           String(body.retryAfter),
      })
      .json(body);
  }
}

// difference between implements and extends
// explain super in details
// what does this entire file do?
// filters, exceptions, interceptors 
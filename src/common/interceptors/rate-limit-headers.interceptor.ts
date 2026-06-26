import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Response } from 'express';

@Injectable()
export class RateLimitHeadersInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      tap(() => {
        const ctx = context.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest();

        // the guard attaches rate limit results to the request
        // so they can be read here after the request succeeds
        if (request.rateLimitResults) {
          const { minute, burst } = request.rateLimitResults;

          // use the more restrictive of the two windows for the headers
          const remaining = Math.min(minute.remaining, burst.remaining);
          const resetAt = minute.resetAt;
          const limit = minute.limit;

          response.set({
            'X-RateLimit-Limit':     String(limit),
            'X-RateLimit-Remaining': String(remaining),
            'X-RateLimit-Reset':     String(Math.floor(new Date(resetAt).getTime() / 1000)),
          });
        }
      }),
    );
  }
}
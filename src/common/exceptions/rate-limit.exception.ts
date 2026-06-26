import { HttpException, HttpStatus } from '@nestjs/common';
import { RateLimitResult } from '../../rate-limit-counters/rate-limit-counters.service';

export class RateLimitException extends HttpException {
  constructor(result: RateLimitResult, windowLabel: string) {
    super(
      {
        statusCode: 429,
        message: `Rate limit exceeded — ${windowLabel}`,
        limit: result.limit,
        remaining: result.remaining,
        resetAt: result.resetAt.toISOString(),
        retryAfter: result.retryAfter,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
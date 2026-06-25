import { Controller } from '@nestjs/common';
import { RateLimitCountersService } from './rate-limit-counters.service';

@Controller('rate-limit-counters')
export class RateLimitCountersController {
  constructor(private readonly rateLimitCountersService: RateLimitCountersService) {}
}

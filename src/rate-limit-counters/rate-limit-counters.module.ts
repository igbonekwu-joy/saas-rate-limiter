import { Module } from '@nestjs/common';
import { RateLimitCountersService } from './rate-limit-counters.service';
import { RateLimitCountersController } from './rate-limit-counters.controller';

@Module({
  controllers: [RateLimitCountersController],
  providers: [RateLimitCountersService],
})
export class RateLimitCountersModule {}

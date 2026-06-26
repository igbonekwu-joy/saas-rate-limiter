import { Module } from '@nestjs/common';
import { RateLimitCountersService } from './rate-limit-counters.service';
import { RateLimitCountersController } from './rate-limit-counters.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RateLimitCounter } from './entities/rate-limit-counter.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([RateLimitCounter]),
  ],
  controllers: [RateLimitCountersController],
  providers: [RateLimitCountersService],
})
export class RateLimitCountersModule {}

import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsRollup } from './entities/analytics-rollup.entity';
import { RateLimitCounter } from 'src/rate-limit-counters/entities/rate-limit-counter.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AnalyticsRollup, RateLimitCounter]),
  ],
  providers: [AnalyticsService],
  controllers: [AnalyticsController]
})
export class AnalyticsModule {}

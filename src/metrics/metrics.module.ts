import { Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RateLimitCounter } from 'src/rate-limit-counters/entities/rate-limit-counter.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RateLimitCounter])],
  providers: [MetricsService],
  controllers: [MetricsController]
})
export class MetricsModule {}

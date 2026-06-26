import { Module } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { ApiKeysController } from './api-keys.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKey } from './entities/api-key.entity';
import { RequestLogsModule } from 'src/request-logs/request-logs.module';
import { ApiKeyGuard } from './guards/rate-limit.guard';
import { RateLimitCountersModule } from 'src/rate-limit-counters/rate-limit-counters.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ApiKey]),
    RateLimitCountersModule,
    RequestLogsModule,
  ],
  controllers: [ApiKeysController],
  providers: [ApiKeysService, ApiKeyGuard],
  exports: [ApiKeyGuard]
})
export class ApiKeysModule {}

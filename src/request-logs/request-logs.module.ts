import { Module } from '@nestjs/common';
import { RequestLogsService } from './request-logs.service';
import { RequestLogsController } from './request-logs.controller';

@Module({
  controllers: [RequestLogsController],
  providers: [RequestLogsService],
})
export class RequestLogsModule {}

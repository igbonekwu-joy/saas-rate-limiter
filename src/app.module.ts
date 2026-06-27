import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { RequestLogsModule } from './request-logs/request-logs.module';
import { RateLimitCountersModule } from './rate-limit-counters/rate-limit-counters.module';
import { ScheduleModule } from '@nestjs/schedule';
import { RateLimitFilter } from './common/filters/rate-limit.filter';
import { APP_FILTER } from '@nestjs/core';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    ApiKeysModule,
    ConfigModule.forRoot({ isGlobal: true }), // loads .env, available everywhere

    TypeOrmModule.forRootAsync({ // async because it needs to wait for configservice to load .env
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST'),
        port: config.get('DB_PORT'),
        username: config.get('DB_USERNAME'),
        password: config.get('DB_PASSWORD'),
        database: config.get('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true, // dev only . typeorm automatically creates/updates tables to match entities
      }),
    }), 
    UsersModule, 
    RequestLogsModule, 
    RateLimitCountersModule,
    ScheduleModule.forRoot(),
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: RateLimitFilter, // NestJS handles instantiation
    },
  ],
})
export class AppModule {}

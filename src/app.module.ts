import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';

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
    }), UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

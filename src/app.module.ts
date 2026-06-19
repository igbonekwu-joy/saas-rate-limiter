import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ApiKeysModule } from './api-keys/api-keys.module';

@Module({
  imports: [ApiKeysModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

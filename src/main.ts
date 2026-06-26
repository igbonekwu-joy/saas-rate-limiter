import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { RateLimitFilter } from './common/filters/rate-limit.filter';
import { RateLimitHeadersInterceptor } from './common/interceptors/rate-limit-headers.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  //app.useGlobalFilters(new RateLimitFilter());
  app.useGlobalInterceptors(new RateLimitHeadersInterceptor());

  const config = new DocumentBuilder()
    .setTitle('API Rate Limiting Platform')
    .setDescription('Protect your APIs with sliding-window rate limiting')
    .setVersion('1.0')
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'api-key')
    .addBearerAuth() // for your own dashboard/user auth, separate from customer API keys
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document); // visit /docs

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

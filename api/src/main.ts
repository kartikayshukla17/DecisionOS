import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
// Use require for morgan to avoid typescript "no call signatures" error
const morgan = require('morgan');

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Required for Slack Signature validation
  });

  // Setup Morgan for HTTP request logging
  app.use(morgan('dev'));
  app.enableCors();
  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();

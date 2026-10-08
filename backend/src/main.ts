import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  // 🔥 Serve images folder
  app.use('/images', express.static(path.join(process.cwd(), 'images')));

  // 🤖 Feature 6 — serve uploads folder (AI analysis images)
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  await app.listen(5000, '0.0.0.0');
}

bootstrap().catch((err) => {
  console.error('Failed to start app:', err);
  process.exit(1);
});

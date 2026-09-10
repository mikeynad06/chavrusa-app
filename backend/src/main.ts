import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const productionOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map((origin) => origin.trim())
    : [];

  app.enableCors({
    origin: ['http://localhost:5173', ...productionOrigins],
  });
  // This turns on the validation shield!
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  const port = process.env.PORT || 3000;
  console.log(`Listening on port: ${port}`);
  await app.listen(port, '0.0.0.0');
}
bootstrap();
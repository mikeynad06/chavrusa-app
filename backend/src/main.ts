import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Railway terminates requests at its proxy, so without this every request appears to come from the
  // proxy's IP and one person could trip the rate limits for everyone. Trust exactly one hop, so
  // req.ip is the client address the proxy put in X-Forwarded-For (and clients can't spoof it).
  app.set('trust proxy', 1);

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
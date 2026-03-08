import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/http/http-exception.filter';

function getCorsOriginAllowlist() {
  const rawAllowlist = process.env.CORS_ORIGIN_ALLOWLIST || '';
  return rawAllowlist
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new HttpExceptionFilter());
  const allowlist = getCorsOriginAllowlist();
  const allowAllDevOrigins =
    process.env.NODE_ENV !== 'production' && allowlist.length === 0;

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowAllDevOrigins || allowlist.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('CORS origin not allowed'), false);
    },
    credentials: true,
  });

  app.use(cookieParser());
  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();

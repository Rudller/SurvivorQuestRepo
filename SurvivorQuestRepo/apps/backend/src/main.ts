import { INestApplication, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/http/http-exception.filter';

const bootstrapLogger = new Logger('Bootstrap');
let appInstance: INestApplication | null = null;
let isShuttingDown = false;

function getCorsOriginAllowlist() {
  const rawAllowlist = process.env.CORS_ORIGIN_ALLOWLIST || '';
  return rawAllowlist
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function isPrivateIpv4(hostname: string) {
  const match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) {
    return false;
  }

  const octets = match.slice(1).map(Number);
  if (octets.some((octet) => Number.isNaN(octet) || octet < 0 || octet > 255)) {
    return false;
  }

  const [first, second] = octets;
  if (first === 10 || first === 127) {
    return true;
  }
  if (first === 192 && second === 168) {
    return true;
  }
  if (first === 172 && second >= 16 && second <= 31) {
    return true;
  }
  return false;
}

function isDevLocalNetworkOrigin(origin: string) {
  try {
    const parsedUrl = new URL(origin);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return false;
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname === '::1') {
      return true;
    }

    return isPrivateIpv4(hostname);
  } catch {
    return false;
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.stack || error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return JSON.stringify(error);
}

async function closeApp() {
  if (!appInstance) {
    return;
  }

  try {
    await appInstance.close();
  } catch (error) {
    bootstrapLogger.error(`Failed to close application gracefully: ${getErrorMessage(error)}`);
  }
}

async function handleFatalError(source: string, error: unknown) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  bootstrapLogger.error(`Fatal error from ${source}: ${getErrorMessage(error)}`);
  await closeApp();
  process.exit(1);
}

async function handleShutdownSignal(signal: NodeJS.Signals) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  bootstrapLogger.warn(`Received ${signal}. Shutting down backend process.`);
  await closeApp();
  process.exit(0);
}

function registerProcessHandlers() {
  process.on('uncaughtException', (error) => {
    void handleFatalError('uncaughtException', error);
  });

  process.on('unhandledRejection', (reason) => {
    void handleFatalError('unhandledRejection', reason);
  });

  process.on('SIGTERM', () => {
    void handleShutdownSignal('SIGTERM');
  });

  process.on('SIGINT', () => {
    void handleShutdownSignal('SIGINT');
  });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  appInstance = app;
  app.useGlobalFilters(new HttpExceptionFilter());
  const allowlist = getCorsOriginAllowlist();
  const allowAllDevOrigins =
    process.env.NODE_ENV !== 'production' &&
    allowlist.length === 0 &&
    process.env.CORS_ALLOW_ALL_DEV_ORIGINS === 'true';

  if (process.env.NODE_ENV === 'production' && allowlist.length === 0) {
    throw new Error('CORS_ORIGIN_ALLOWLIST is required in production');
  }

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

      if (process.env.NODE_ENV !== 'production' && isDevLocalNetworkOrigin(origin)) {
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

registerProcessHandlers();
void bootstrap().catch((error: unknown) => {
  void handleFatalError('bootstrap', error);
});

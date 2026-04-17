import { INestApplication, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/http/http-exception.filter';
import {
  getCorsOriginAllowlist,
  isCorsOriginAllowed,
} from './common/security/cors-origin';

const bootstrapLogger = new Logger('Bootstrap');
let appInstance: INestApplication | null = null;
let isShuttingDown = false;

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
    bootstrapLogger.error(
      `Failed to close application gracefully: ${getErrorMessage(error)}`,
    );
  }
}

async function handleFatalError(source: string, error: unknown) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  bootstrapLogger.error(
    `Fatal error from ${source}: ${getErrorMessage(error)}`,
  );
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

      if (isCorsOriginAllowed(origin)) {
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

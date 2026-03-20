const DEFAULT_MIN_SECRET_LENGTH = 32;

type RuntimeSecretOptions = {
  key: string;
  minLength?: number;
  developmentFallback?: string;
};

export function readRuntimeSecret(options: RuntimeSecretOptions) {
  const minLength = options.minLength ?? DEFAULT_MIN_SECRET_LENGTH;
  const value = process.env[options.key]?.trim();

  if (value) {
    if (value.length < minLength) {
      throw new Error(
        `${options.key} must be at least ${minLength} characters long`,
      );
    }
    return value;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required environment variable: ${options.key}`);
  }

  if (options.developmentFallback) {
    if (options.developmentFallback.length < minLength) {
      throw new Error(
        `Development fallback for ${options.key} must be at least ${minLength} characters long`,
      );
    }
    return options.developmentFallback;
  }

  throw new Error(`Missing required environment variable: ${options.key}`);
}

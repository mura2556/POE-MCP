import pino, { LoggerOptions, Logger as PinoLogger } from "pino";

export type Logger = PinoLogger;

export interface CreateLoggerOptions extends LoggerOptions {
  name?: string;
}

export const createLogger = (options: CreateLoggerOptions = {}): Logger => {
  const {
    name = "poe-mcp",
    level = process.env.LOG_LEVEL ?? "info",
    ...rest
  } = options;

  return pino({
    name,
    level,
    base: undefined,
    ...rest
  });
};

export const rootLogger = createLogger();

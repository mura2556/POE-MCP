import { createRequire } from "module";

export type LogLevel =
  | "fatal"
  | "error"
  | "warn"
  | "info"
  | "debug"
  | "trace"
  | "silent";

type LogMethod = (...args: unknown[]) => void;

export interface Logger {
  fatal: LogMethod;
  error: LogMethod;
  warn: LogMethod;
  info: LogMethod;
  debug: LogMethod;
  trace: LogMethod;
  child(bindings: Record<string, unknown>): Logger;
}

export interface CreateLoggerOptions {
  name?: string;
  level?: LogLevel;
  base?: Record<string, unknown> | null;
  bindings?: Record<string, unknown>;
  [key: string]: unknown;
}

type PinoFactory = ((options?: Record<string, unknown>) => Logger) | null;

const require = createRequire(import.meta.url);

let cachedPinoFactory: PinoFactory | undefined;
const loadPinoFactory = (): PinoFactory => {
  if (cachedPinoFactory !== undefined) {
    return cachedPinoFactory;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires -- dynamic require allows running without bundling pino
    const mod = require("pino") as { default?: PinoFactory } & PinoFactory;
    cachedPinoFactory = (mod && ("default" in mod ? mod.default : mod)) as PinoFactory;
  } catch (error) {
    if (process.env.NODE_ENV !== "test") {
      console.warn("pino is not available; falling back to console logger", error);
    }
    cachedPinoFactory = null;
  }

  return cachedPinoFactory;
};

const levelRank: Record<Exclude<LogLevel, "silent">, number> = {
  fatal: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
  trace: 5,
};

const normalizeLevel = (level: LogLevel | undefined): LogLevel => {
  if (!level) {
    return "info";
  }

  if (level === "silent") {
    return "silent";
  }

  if (Object.prototype.hasOwnProperty.call(levelRank, level)) {
    return level;
  }

  return "info";
};

const createConsoleLogger = (
  name: string,
  level: LogLevel,
  bindings: Record<string, unknown>,
): Logger => {
  const resolvedLevel = normalizeLevel(level);
  const threshold =
    resolvedLevel === "silent"
      ? -1
      : levelRank[resolvedLevel as Exclude<LogLevel, "silent">];

  const formatPrefix = () => {
    const bindingEntries = Object.entries(bindings);
    const bindingString = bindingEntries.length
      ? ` ${JSON.stringify(bindings)}`
      : "";
    return `[${name}]${bindingString}`;
  };

  const shouldLog = (levelName: Exclude<LogLevel, "silent">) =>
    levelRank[levelName] <= threshold;

  const makeLoggerMethod = (
    levelName: Exclude<LogLevel, "silent">,
    method: "error" | "warn" | "info" | "debug",
  ): LogMethod =>
    (...args: unknown[]) => {
      if (!shouldLog(levelName)) {
        return;
      }

      (console as Record<typeof method, LogMethod>)[method](formatPrefix(), ...args);
    };

  const child = (childBindings: Record<string, unknown>): Logger =>
    createConsoleLogger(name, resolvedLevel, {
      ...bindings,
      ...childBindings,
    });

  return {
    fatal: makeLoggerMethod("fatal", "error"),
    error: makeLoggerMethod("error", "error"),
    warn: makeLoggerMethod("warn", "warn"),
    info: makeLoggerMethod("info", "info"),
    debug: makeLoggerMethod("debug", "debug"),
    trace: makeLoggerMethod("trace", "debug"),
    child,
  };
};

export const createLogger = (options: CreateLoggerOptions = {}): Logger => {
  const {
    name = "poe-mcp",
    level = (process.env.LOG_LEVEL as LogLevel | undefined) ?? "info",
    bindings = {},
    ...rest
  } = options;

  const pinoFactory = loadPinoFactory();
  if (pinoFactory) {
    return pinoFactory({
      name,
      level,
      base: undefined,
      ...rest,
    }) as Logger;
  }

  return createConsoleLogger(name, level, bindings);
};

export const rootLogger = createLogger();

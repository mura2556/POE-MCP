import { randomUUID } from 'node:crypto';

type LogLevel = 'info' | 'warn' | 'error';

interface LogMeta {
  requestId?: string;
  scope?: string;
  provenance?: string;
  [key: string]: unknown;
}

function write(level: LogLevel, message: string, meta: LogMeta = {}): void {
  const payload = {
    level,
    message,
    time: new Date().toISOString(),
    ...meta,
  };
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

export function logInfo(message: string, meta?: LogMeta): void {
  write('info', message, meta);
}

export function logWarn(message: string, meta?: LogMeta): void {
  write('warn', message, meta);
}

export function logError(message: string, meta?: LogMeta): void {
  write('error', message, meta);
}

export function createRequestContext(scope: string, baseMeta: LogMeta = {}): {
  requestId: string;
  info: (message: string, meta?: LogMeta) => void;
  warn: (message: string, meta?: LogMeta) => void;
  error: (message: string, meta?: LogMeta) => void;
} {
  const requestId = baseMeta.requestId ?? randomUUID();
  const withScope = (meta: LogMeta = {}) => ({ requestId, scope, ...baseMeta, ...meta });
  return {
    requestId,
    info: (message: string, meta?: LogMeta) => logInfo(message, withScope(meta)),
    warn: (message: string, meta?: LogMeta) => logWarn(message, withScope(meta)),
    error: (message: string, meta?: LogMeta) => logError(message, withScope(meta)),
  };
}

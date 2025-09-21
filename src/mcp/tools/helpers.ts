import { ZodError, type ZodRawShape, z } from "zod";

import type { DataContext } from "../../data/index.js";
import { DataContextError } from "../../data/index.js";
import type { Logger } from "../../logging/index.js";
import type { ToolRegistrationContext } from "./types.js";

const FALLBACK_ERROR_HINT = "Check the arguments and try again.";

export const baseToolOutputShape = {
  snapshotVersion: z.string(),
  league: z.string(),
  error: z.string().optional(),
  hint: z.string().optional()
};

export const createToolOutputSchema = <Shape extends ZodRawShape>(shape: Shape) =>
  z.object({
    ...baseToolOutputShape,
    ...shape
  });

export interface ToolHandlerResult<T extends Record<string, unknown>> {
  data: T;
  text?: string;
}

const getSnapshotMetadata = (dataContext: DataContext) => {
  try {
    const info = dataContext.getSnapshotInfo();
    return { version: info.version, league: info.league };
  } catch {
    return { version: "unknown", league: "unknown" };
  }
};

export const buildSuccessResponse = <T extends Record<string, unknown>>(
  dataContext: DataContext,
  payload: T,
  text?: string
) => {
  const snapshot = getSnapshotMetadata(dataContext);
  const structuredContent = {
    snapshotVersion: snapshot.version,
    league: snapshot.league,
    ...payload
  };

  return {
    content: [
      {
        type: "text" as const,
        text: text ?? JSON.stringify(structuredContent, null, 2)
      }
    ],
    structuredContent
  };
};

export const buildErrorResponse = (
  dataContext: DataContext,
  logger: Logger,
  error: unknown,
  defaultHint = FALLBACK_ERROR_HINT
) => {
  let message = "Unexpected error";
  let hint = defaultHint;

  if (error instanceof DataContextError) {
    message = error.message;
    hint = error.hint ?? defaultHint;
  } else if (error instanceof ZodError) {
    message = "Invalid arguments provided.";
    hint = error.issues.map((issue) => issue.message).join("; ") || defaultHint;
  } else if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === "string") {
    message = error;
  }

  logger.warn({ error: error instanceof Error ? error.message : error }, message);

  const snapshot = getSnapshotMetadata(dataContext);
  const structuredContent = {
    snapshotVersion: snapshot.version,
    league: snapshot.league,
    error: message,
    hint
  };

  return {
    content: [
      {
        type: "text" as const,
        text: hint ? `${message}\nHint: ${hint}` : message
      }
    ],
    structuredContent,
    isError: true as const
  };
};

export const wrapToolHandler = <Input, Payload extends Record<string, unknown>>(
  context: ToolRegistrationContext,
  schema: z.ZodType<Input>,
  handler: (input: Input) => Promise<ToolHandlerResult<Payload>> | ToolHandlerResult<Payload>,
  options: { errorHint?: string } = {}
) => {
  return async (rawInput: unknown) => {
    try {
      const parsed = schema.parse(rawInput);
      const result = await handler(parsed);
      return buildSuccessResponse(context.dataContext, result.data, result.text);
    } catch (error) {
      return buildErrorResponse(
        context.dataContext,
        context.logger,
        error,
        options.errorHint
      );
    }
  };
};

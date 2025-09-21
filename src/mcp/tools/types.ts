import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { z } from "zod";

import type { DataContext } from "../../data/index.js";
import type { Logger } from "../../logging/index.js";

export interface ToolRegistrar {
  registerTool: <InputArgs extends z.ZodRawShape, OutputArgs extends z.ZodRawShape>(
    name: string,
    config: {
      title?: string;
      description?: string;
      inputSchema?: InputArgs;
      outputSchema?: OutputArgs;
      annotations?: Record<string, unknown>;
      _meta?: Record<string, unknown>;
    },
    cb: ToolCallback<InputArgs>
  ) => unknown;
}

export interface ToolRegistrationContext {
  server: ToolRegistrar;
  dataContext: DataContext;
  logger: Logger;
}

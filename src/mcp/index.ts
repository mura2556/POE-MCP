import { createRequire } from "module";

import type { DataContext } from "../data/index.js";
import type { Logger } from "../logging/index.js";
import { registerAllTools } from "./tools/index.js";
import type { ToolRegistrar } from "./tools/types.js";

const require = createRequire(import.meta.url);

type McpModule = typeof import("@modelcontextprotocol/sdk/server/mcp.js");
type StdioModule = typeof import("@modelcontextprotocol/sdk/server/stdio.js");

interface RegisteredTool {
  name: string;
  config: Record<string, unknown>;
  callback: (...args: unknown[]) => unknown;
}

export interface McpTransport {
  close: () => Promise<void>;
}

export interface McpServerInstance extends ToolRegistrar {
  connect: (transport: McpTransport) => Promise<void>;
  close: () => Promise<void>;
  _registeredTools?: Record<string, RegisteredTool>;
}

class InMemoryTransport implements McpTransport {
  async close(): Promise<void> {
    // no-op fallback transport
  }
}

class InMemoryMcpServer implements McpServerInstance {
  public readonly _registeredTools: Record<string, RegisteredTool> = {};

  constructor(
    private readonly metadata: {
      name: string;
      version: string;
    }
  ) {
    if (process.env.NODE_ENV !== "test") {
      console.warn(
        "@modelcontextprotocol/sdk not available; using in-memory MCP server",
        metadata
      );
    }
  }

  registerTool: ToolRegistrar["registerTool"] = (
    name,
    config,
    callback
  ) => {
    this._registeredTools[name] = {
      name,
      config: config as Record<string, unknown>,
      callback: callback as unknown as (...args: unknown[]) => unknown
    };
  };

  async connect(_transport: McpTransport): Promise<void> {
    // no-op
  }

  async close(): Promise<void> {
    // no-op
  }
}

let cachedMcpModule: McpModule | null | undefined;
const loadMcpModule = (): McpModule | null => {
  if (cachedMcpModule !== undefined) {
    return cachedMcpModule;
  }

  try {
    cachedMcpModule = require("@modelcontextprotocol/sdk/server/mcp.js") as McpModule;
  } catch (error) {
    if (process.env.NODE_ENV !== "test") {
      console.warn("Failed to load MCP server module", error);
    }
    cachedMcpModule = null;
  }

  return cachedMcpModule;
};

let cachedStdioModule: StdioModule | null | undefined;
const loadStdioModule = (): StdioModule | null => {
  if (cachedStdioModule !== undefined) {
    return cachedStdioModule;
  }

  try {
    cachedStdioModule = require(
      "@modelcontextprotocol/sdk/server/stdio.js"
    ) as StdioModule;
  } catch (error) {
    if (process.env.NODE_ENV !== "test") {
      console.warn("Failed to load MCP stdio transport", error);
    }
    cachedStdioModule = null;
  }

  return cachedStdioModule;
};

const DEFAULT_SERVER_NAME = "poe-mcp-server";
const DEFAULT_SERVER_VERSION = "0.1.0";

export interface CreateMcpServerOptions {
  dataContext: DataContext;
  logger: Logger;
}

export const createMcpServer = (
  options: CreateMcpServerOptions
): McpServerInstance => {
  const module = loadMcpModule();
  const server: McpServerInstance = module
    ? (new module.McpServer({
        name: DEFAULT_SERVER_NAME,
        version: DEFAULT_SERVER_VERSION
      }) as unknown as McpServerInstance)
    : new InMemoryMcpServer({
        name: DEFAULT_SERVER_NAME,
        version: DEFAULT_SERVER_VERSION
      });

  registerAllTools({
    server,
    dataContext: options.dataContext,
    logger: options.logger
  });

  return server;
};

const createTransport = (): McpTransport => {
  const stdioModule = loadStdioModule();
  if (stdioModule) {
    return new stdioModule.StdioServerTransport() as unknown as McpTransport;
  }
  return new InMemoryTransport();
};

export const startMcpServer = async (
  options: CreateMcpServerOptions
) => {
  const server = createMcpServer(options);
  const transport = createTransport();
  await server.connect(transport);
  options.logger.info("MCP server listening on stdio");
  return { server, transport };
};

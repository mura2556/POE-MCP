import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import type { DataContext } from "../data/index.js";
import type { Logger } from "../logging/index.js";
import { registerAllTools } from "./tools/index.js";

export interface CreateMcpServerOptions {
  dataContext: DataContext;
  logger: Logger;
}

export const createMcpServer = (
  options: CreateMcpServerOptions
): McpServer => {
  const server = new McpServer({
    name: "poe-mcp-server",
    version: "0.1.0"
  });

  registerAllTools({
    server,
    dataContext: options.dataContext,
    logger: options.logger
  });

  return server;
};

export const startMcpServer = async (
  options: CreateMcpServerOptions
) => {
  const server = createMcpServer(options);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  options.logger.info("MCP server listening on stdio");
  return { server, transport };
};

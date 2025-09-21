import { pathToFileURL } from "node:url";

import { loadConfig } from "../config/index.js";
import { createDataContext } from "../data/index.js";
import { createLogger } from "../logging/index.js";
import { startMcpServer } from "../mcp/index.js";
import type { HttpServerHandle } from "./http.js";
import { startHttpServer } from "./http.js";

export interface BootstrapResult {
  close: () => Promise<void>;
  http?: HttpServerHandle;
}

export const bootstrap = async (): Promise<BootstrapResult> => {
  const config = loadConfig();
  const logger = createLogger();
  const dataContext = createDataContext({
    snapshotDir: config.ingest.snapshotDir,
    logger
  });

  await dataContext.ensureReady();

  let httpHandle: HttpServerHandle | undefined;
  if (config.server.httpEnabled) {
    httpHandle = await startHttpServer(config, dataContext, logger);
  }

  const { server: mcpServer, transport } = await startMcpServer({
    dataContext,
    logger
  });

  const close = async () => {
    await transport.close();
    await mcpServer.close();
    if (httpHandle) {
      await httpHandle.close();
    }
  };

  const handleSignal = async (signal: string) => {
    logger.info({ signal }, "Received signal, shutting down");
    await close();
    process.exit(0);
  };

  process.once("SIGINT", handleSignal);
  process.once("SIGTERM", handleSignal);

  logger.info({
    httpEnabled: Boolean(httpHandle),
    snapshotDir: config.ingest.snapshotDir
  }, "Server bootstrapped");

  return {
    close,
    http: httpHandle
  };
};

const isMainModule = () => {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }

  return import.meta.url === pathToFileURL(entry).href;
};

if (isMainModule()) {
  bootstrap().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

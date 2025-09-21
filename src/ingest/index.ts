import { pathToFileURL } from "node:url";
import { loadConfig } from "../config/index.js";
import { createLogger } from "../logging/index.js";
import { runIngestionPipeline } from "./pipeline.js";

export const main = async () => {
  const config = loadConfig();
  const logger = createLogger({ name: "ingest" });

  logger.info(
    { snapshotDir: config.ingest.snapshotDir },
    "Starting ingestion pipeline"
  );

  const result = await runIngestionPipeline({
    snapshotDir: config.ingest.snapshotDir,
    logger,
    forceRefresh: config.ingestion.forceRefresh
  });

  logger.info(
    {
      filePath: result.filePath,
      itemCount: result.snapshot.items.length,
      createdAt: result.snapshot.createdAt
    },
    "Ingestion finished"
  );
};

const isMainModule = () => {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }

  return import.meta.url === pathToFileURL(entry).href;
};

if (isMainModule()) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

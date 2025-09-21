import type { Logger } from "../logging/index.js";
import { loadDefaultBuilds } from "../data/pob.js";
import { loadRePoEItems, toItemPrice } from "../data/repoe.js";
import { createSnapshotStore } from "../data/snapshots.js";
import type { ItemPrice, Snapshot } from "../data/types.js";
import { normalizeItemName } from "../data/normalize.js";

export interface IngestionOptions {
  snapshotDir: string;
  logger?: Logger;
  forceRefresh?: boolean;
  repoeFilePath?: string;
}

export interface IngestionResult {
  snapshot: Snapshot;
  filePath: string;
}

const mergeSources = (sources: string[], add: string): string[] => {
  if (sources.includes(add)) {
    return sources;
  }

  return [...sources, add];
};

const buildSnapshot = async (
  options: IngestionOptions
): Promise<Snapshot> => {
  const [items, builds] = await Promise.all([
    loadRePoEItems({ filePath: options.repoeFilePath }),
    Promise.resolve(loadDefaultBuilds())
  ]);

  const popularity = new Map<string, number>();
  for (const build of builds) {
    for (const itemName of build.items) {
      const normalized = normalizeItemName(itemName);
      popularity.set(normalized, (popularity.get(normalized) ?? 0) + 1);
    }
  }

  const snapshotItems: ItemPrice[] = items.map((item) => {
    const base = toItemPrice(item);
    const usage = popularity.get(base.normalizedName) ?? 0;
    const confidence = Math.min(1, base.confidence + usage * 0.05);
    const listings = base.listings + usage * 10;
    const sources = usage > 0 ? mergeSources(base.sources, "Path of Building") : base.sources;

    return {
      ...base,
      confidence,
      listings,
      sampleSize: base.sampleSize + usage * 5,
      sources
    };
  });

  const snapshot: Snapshot = {
    version: "0.1.0",
    createdAt: new Date().toISOString(),
    items: snapshotItems,
    metadata: {
      league: "Offline",
      source: "stub-ingestion-pipeline",
      notes: "Generated from bundled stub data so the server can run offline.",
      repoeItems: items.length,
      pobBuilds: builds.length
    }
  };

  return snapshot;
};

export const runIngestionPipeline = async (
  options: IngestionOptions
): Promise<IngestionResult> => {
  const store = createSnapshotStore(options.snapshotDir, options.logger);
  await store.ensureReady();

  const snapshot = await buildSnapshot(options);
  const filePath = await store.saveSnapshot(snapshot);
  options.logger?.info(
    {
      filePath,
      itemCount: snapshot.items.length,
      createdAt: snapshot.createdAt
    },
    "Snapshot created"
  );

  return { snapshot, filePath };
};

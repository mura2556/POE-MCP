import type { Logger } from "../logging/index.js";
import { normalizeItemName } from "../data/normalize.js";
import { loadExtraData } from "./sources/extra.js";
import { loadNinjaPrices } from "./sources/ninja.js";
import { loadRePoeSnapshot } from "./sources/repoe.js";
import { createSnapshotStore } from "../data/snapshots.js";
import type {
  ItemPrice,
  NameIndex,
  NameIndexEntry,
  PriceTable,
  Snapshot
} from "../data/types.js";

export interface IngestionOptions {
  snapshotDir: string;
  logger?: Logger;
  version?: string;
  forceRefresh?: boolean;
}

export interface IngestionResult {
  snapshot: Snapshot;
  filePath: string;
}

const DEFAULT_VERSION = "1.0.0";

const buildNameIndex = (snapshot: Snapshot): NameIndex => {
  const entries: NameIndexEntry[] = [];
  const bySlug: Record<string, NameIndexEntry> = {};

  const register = (entry: NameIndexEntry) => {
    const normalizedSlug = normalizeItemName(entry.slug);
    const stored: NameIndexEntry = { ...entry, slug: normalizedSlug };
    entries.push(stored);
    bySlug[normalizedSlug] = stored;
    if (entry.aliases) {
      for (const alias of entry.aliases) {
        bySlug[normalizeItemName(alias)] = stored;
      }
    }
  };

  const registerItem = (item: ItemPrice) => {
    register({
      id: item.itemId,
      name: item.name,
      slug: item.normalizedName,
      type: "item",
      aliases: [item.itemId],
      tags: [item.category]
    });
  };

  const registerTable = (table: PriceTable) => {
    const slug = normalizeItemName(table.title);
    register({
      id: table.id,
      name: table.title,
      slug,
      type: "price-table",
      aliases: [table.category]
    });
  };

  for (const item of snapshot.items) {
    registerItem(item);
  }

  for (const table of Object.values(snapshot.prices.tables)) {
    registerTable(table);
  }

  for (const mod of Object.values(snapshot.mods)) {
    register({
      id: mod.id,
      name: mod.name,
      slug: normalizeItemName(mod.name),
      type: "mod",
      aliases: [mod.id, mod.group ?? ""].filter(Boolean),
      tags: mod.tags
    });
  }

  for (const base of Object.values(snapshot.bases)) {
    register({
      id: base.id,
      name: base.name,
      slug: normalizeItemName(base.name),
      type: "base",
      aliases: [base.id],
      tags: base.tags
    });
  }

  for (const gem of Object.values(snapshot.gems)) {
    register({
      id: gem.id,
      name: gem.name,
      slug: normalizeItemName(gem.name),
      type: "gem",
      aliases: [gem.id],
      tags: gem.tags
    });
  }

  for (const tag of Object.values(snapshot.tags)) {
    const slug = normalizeItemName(tag.label);
    const aliases = [tag.id, ...(tag.synonyms ?? [])];
    register({
      id: tag.id,
      name: tag.label,
      slug,
      type: "tag",
      aliases
    });
  }

  for (const rule of Object.values(snapshot.rules.rules)) {
    register({
      id: rule.id,
      name: rule.title,
      slug: normalizeItemName(rule.title),
      type: "rule",
      aliases: [rule.id],
      tags: rule.tags
    });
  }

  for (const build of Object.values(snapshot.pob.builds)) {
    register({
      id: build.id,
      name: build.name,
      slug: normalizeItemName(build.name),
      type: "pob-build",
      aliases: [build.id, build.mainSkill],
      tags: build.tags
    });
  }

  return { entries, bySlug };
};

const mergeSnapshots = async (version: string): Promise<Snapshot> => {
  const [repoe, ninja, extras] = await Promise.all([
    loadRePoeSnapshot(),
    loadNinjaPrices(),
    loadExtraData()
  ]);

  const createdAt = new Date().toISOString();

  const snapshot: Snapshot = {
    version,
    createdAt,
    metadata: {
      league: ninja.league,
      source: "ingest-pipeline",
      notes: "Generated from offline seed data for testing.",
      repoeMods: Object.keys(repoe.mods).length,
      repoeBases: Object.keys(repoe.bases).length,
      repoeGems: Object.keys(repoe.gems).length,
      priceTableCount: Object.keys(ninja.prices.tables).length,
      pobBuilds: Object.keys(extras.builds).length
    },
    prices: ninja.prices,
    items: Object.values(ninja.prices.items),
    mods: repoe.mods,
    bases: repoe.bases,
    gems: repoe.gems,
    tags: repoe.tags,
    nameIndex: { entries: [], bySlug: {} },
    pob: { builds: extras.builds },
    rules: extras.rules
  };

  snapshot.nameIndex = buildNameIndex(snapshot);
  return snapshot;
};

export const runIngestionPipeline = async (
  options: IngestionOptions
): Promise<IngestionResult> => {
  const version = options.version ?? DEFAULT_VERSION;
  const store = createSnapshotStore(options.snapshotDir, options.logger);
  await store.ensureReady();

  const snapshot = await mergeSnapshots(version);
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

import { promises as fs } from "node:fs";
import path from "node:path";
import type { Logger } from "../logging/index.js";
import type {
  BaseItemDefinition,
  CraftingRuleSet,
  GemDefinition,
  ModDefinition,
  NameIndex,
  PobBuildSummary,
  Snapshot,
  SnapshotIndexFile,
  SnapshotPriceTables,
  SnapshotStore,
  SnapshotSummary,
  TagDefinition
} from "./types.js";

const INDEX_FILE = "index.json";
const LATEST_POINTER = "latest.json";

interface SnapshotPointer {
  id: string;
}

const readJson = async <T>(filePath: string): Promise<T> => {
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as T;
};

const writeJson = async (filePath: string, value: unknown): Promise<void> => {
  const data = JSON.stringify(value, null, 2);
  await fs.writeFile(filePath, data, "utf-8");
};

const ensureIndexStats = (prices: SnapshotPriceTables): number =>
  Object.keys(prices.items).length;

const buildSnapshot = (
  index: SnapshotIndexFile,
  prices: SnapshotPriceTables,
  mods: Record<string, ModDefinition>,
  bases: Record<string, BaseItemDefinition>,
  gems: Record<string, GemDefinition>,
  tags: Record<string, TagDefinition>,
  nameIndex: NameIndex,
  pobBuilds: Record<string, PobBuildSummary>,
  rules: CraftingRuleSet
): Snapshot => ({
  version: index.version,
  createdAt: index.createdAt,
  metadata: index.metadata,
  prices,
  items: Object.values(prices.items),
  mods,
  bases,
  gems,
  tags,
  nameIndex,
  pob: { builds: pobBuilds },
  rules
});

const formatSummary = (
  id: string,
  index: SnapshotIndexFile,
  itemCount: number
): SnapshotSummary => ({
  id,
  createdAt: index.createdAt,
  version: index.version,
  itemCount
});

export class FileSystemSnapshotStore implements SnapshotStore {
  constructor(private readonly directory: string, private readonly logger?: Logger) {}

  async ensureReady(): Promise<void> {
    await fs.mkdir(this.directory, { recursive: true });
  }

  private resolveDirectory(id: string): string {
    return path.isAbsolute(id) ? id : path.join(this.directory, id);
  }

  private async readIndex(directory: string): Promise<SnapshotIndexFile> {
    const indexPath = path.join(directory, INDEX_FILE);
    return readJson<SnapshotIndexFile>(indexPath);
  }

  private async readPointer(): Promise<SnapshotPointer | null> {
    try {
      const pointer = await readJson<SnapshotPointer>(path.join(this.directory, LATEST_POINTER));
      if (pointer && pointer.id) {
        return pointer;
      }
      return null;
    } catch (error) {
      this.logger?.debug({ error }, "Latest snapshot pointer missing");
      return null;
    }
  }

  private async writePointer(id: string): Promise<void> {
    const pointer: SnapshotPointer = { id };
    await writeJson(path.join(this.directory, LATEST_POINTER), pointer);
  }

  private async getSnapshotIds(): Promise<string[]> {
    const entries = await fs.readdir(this.directory, { withFileTypes: true });
    const ids: string[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      const indexPath = path.join(this.directory, entry.name, INDEX_FILE);
      try {
        await fs.access(indexPath);
        ids.push(entry.name);
      } catch {
        this.logger?.debug({ entry: entry.name }, "Skipping snapshot without index file");
      }
    }
    return ids;
  }

  private async loadSnapshotFiles(directory: string, index: SnapshotIndexFile) {
    const readRelative = async <T>(fileName: string): Promise<T> => {
      const resolved = path.join(directory, fileName);
      return readJson<T>(resolved);
    };

    const prices = await readRelative<SnapshotPriceTables>(index.files.prices);
    const mods = await readRelative<Record<string, ModDefinition>>(index.files.mods);
    const bases = await readRelative<Record<string, BaseItemDefinition>>(index.files.bases);
    const gems = await readRelative<Record<string, GemDefinition>>(index.files.gems);
    const tags = await readRelative<Record<string, TagDefinition>>(index.files.tags);
    const nameIndex = await readRelative<NameIndex>(index.files.indices);
    const pobBuilds = await readRelative<Record<string, PobBuildSummary>>(index.files.pob);
    const rules = await readRelative<CraftingRuleSet>(index.files.rules);

    return {
      prices,
      mods,
      bases,
      gems,
      tags,
      nameIndex,
      pobBuilds,
      rules
    };
  }

  async loadLatestSnapshot(): Promise<Snapshot> {
    await this.ensureReady();

    const pointer = await this.readPointer();
    if (pointer) {
      try {
        return this.loadSnapshot(pointer.id);
      } catch (error) {
        this.logger?.warn({ pointer, error }, "Failed to load pointed snapshot, falling back to scan");
      }
    }

    const ids = await this.getSnapshotIds();
    if (ids.length === 0) {
      throw new Error(
        `No snapshot data found in ${this.directory}. Run the ingestion pipeline first.`
      );
    }

    let latestId = ids[0];
    let latestCreatedAt = "";
    for (const id of ids) {
      const directory = this.resolveDirectory(id);
      const index = await this.readIndex(directory);
      if (index.createdAt >= latestCreatedAt) {
        latestCreatedAt = index.createdAt;
        latestId = id;
      }
    }

    await this.writePointer(latestId);
    return this.loadSnapshot(latestId);
  }

  async loadSnapshot(id: string): Promise<Snapshot> {
    const directory = this.resolveDirectory(id);
    const index = await this.readIndex(directory);
    const files = await this.loadSnapshotFiles(directory, index);
    return buildSnapshot(
      index,
      files.prices,
      files.mods,
      files.bases,
      files.gems,
      files.tags,
      files.nameIndex,
      files.pobBuilds,
      files.rules
    );
  }

  async saveSnapshot(snapshot: Snapshot): Promise<string> {
    await this.ensureReady();
    const timestamp = snapshot.createdAt.replace(/[:.]/g, "-");
    const versionSafe = snapshot.version.replace(/[^a-z0-9.-]/gi, "-");
    const id = `${versionSafe}-${timestamp}`;
    const directory = this.resolveDirectory(id);

    const files: SnapshotIndexFile["files"] = {
      prices: "prices.json",
      mods: "mods.json",
      bases: "bases.json",
      gems: "gems.json",
      tags: "tags.json",
      indices: "indices.json",
      pob: "pob.json",
      rules: "rules.json"
    };

    await fs.mkdir(directory, { recursive: true });

    await writeJson(path.join(directory, files.prices), snapshot.prices);
    await writeJson(path.join(directory, files.mods), snapshot.mods);
    await writeJson(path.join(directory, files.bases), snapshot.bases);
    await writeJson(path.join(directory, files.gems), snapshot.gems);
    await writeJson(path.join(directory, files.tags), snapshot.tags);
    await writeJson(path.join(directory, files.indices), snapshot.nameIndex);
    await writeJson(path.join(directory, files.pob), snapshot.pob.builds);
    await writeJson(path.join(directory, files.rules), snapshot.rules);

    const index: SnapshotIndexFile = {
      version: snapshot.version,
      createdAt: snapshot.createdAt,
      metadata: snapshot.metadata,
      files,
      stats: {
        itemCount: ensureIndexStats(snapshot.prices)
      }
    };

    await writeJson(path.join(directory, INDEX_FILE), index);
    await this.writePointer(id);
    this.logger?.info({ directory }, "Snapshot saved");
    return directory;
  }

  async listSnapshots(): Promise<SnapshotSummary[]> {
    await this.ensureReady();
    const ids = await this.getSnapshotIds();
    const summaries: SnapshotSummary[] = [];

    for (const id of ids) {
      try {
        const directory = this.resolveDirectory(id);
        const index = await this.readIndex(directory);
        let itemCount = index.stats?.itemCount;
        if (typeof itemCount !== "number") {
          const prices = await readJson<SnapshotPriceTables>(
            path.join(directory, index.files.prices)
          );
          itemCount = ensureIndexStats(prices);
        }
        summaries.push(formatSummary(id, index, itemCount));
      } catch (error) {
        this.logger?.warn({ id, error }, "Failed to parse snapshot");
      }
    }

    return summaries.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
}

export const createSnapshotStore = (
  directory: string,
  logger?: Logger
): SnapshotStore => new FileSystemSnapshotStore(directory, logger);

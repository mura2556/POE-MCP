import { promises as fs } from "node:fs";
import path from "node:path";
import type { Logger } from "../logging/index.js";
import type { Snapshot, SnapshotStore, SnapshotSummary } from "./types.js";

const SNAPSHOT_EXTENSION = ".json";

const parseSnapshot = async (filePath: string): Promise<Snapshot> => {
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as Snapshot;
};

const formatSummary = (fileName: string, snapshot: Snapshot): SnapshotSummary => ({
  fileName,
  createdAt: snapshot.createdAt,
  version: snapshot.version,
  itemCount: snapshot.items.length
});

export class FileSystemSnapshotStore implements SnapshotStore {
  constructor(private readonly directory: string, private readonly logger?: Logger) {}

  async ensureReady(): Promise<void> {
    await fs.mkdir(this.directory, { recursive: true });
  }

  private resolvePath(fileName: string): string {
    return path.isAbsolute(fileName)
      ? fileName
      : path.join(this.directory, fileName);
  }

  private async getSnapshotFiles(): Promise<string[]> {
    await this.ensureReady();
    const entries = await fs.readdir(this.directory);
    return entries.filter((entry) => entry.endsWith(SNAPSHOT_EXTENSION));
  }

  async loadLatestSnapshot(): Promise<Snapshot> {
    const files = await this.getSnapshotFiles();
    if (files.length === 0) {
      throw new Error(
        `No snapshot files found in ${this.directory}. Run the ingestion pipeline first.`
      );
    }

    let latestFile = files[0];
    let latestMtime = 0;
    for (const file of files) {
      const fullPath = this.resolvePath(file);
      const stats = await fs.stat(fullPath);
      if (stats.mtimeMs >= latestMtime) {
        latestMtime = stats.mtimeMs;
        latestFile = file;
      }
    }

    const snapshot = await this.loadSnapshot(latestFile);
    this.logger?.debug({ latestFile }, "Loaded latest snapshot");
    return snapshot;
  }

  async loadSnapshot(fileName: string): Promise<Snapshot> {
    const filePath = this.resolvePath(fileName);
    const snapshot = await parseSnapshot(filePath);
    return snapshot;
  }

  async saveSnapshot(snapshot: Snapshot): Promise<string> {
    await this.ensureReady();
    const timestamp = snapshot.createdAt.replace(/[:.]/g, "-");
    const fileName = `snapshot-${timestamp}${SNAPSHOT_EXTENSION}`;
    const filePath = this.resolvePath(fileName);
    const pretty = JSON.stringify(snapshot, null, 2);
    await fs.writeFile(filePath, pretty, "utf-8");
    await fs.writeFile(this.resolvePath("latest.json"), pretty, "utf-8");
    this.logger?.info({ filePath }, "Snapshot saved");
    return filePath;
  }

  async listSnapshots(): Promise<SnapshotSummary[]> {
    const files = await this.getSnapshotFiles();
    const summaries: SnapshotSummary[] = [];
    for (const file of files) {
      try {
        const snapshot = await this.loadSnapshot(file);
        summaries.push(formatSummary(file, snapshot));
      } catch (error) {
        this.logger?.warn({ file, error }, "Failed to parse snapshot");
      }
    }

    return summaries.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
}

export const createSnapshotStore = (
  directory: string,
  logger?: Logger
): SnapshotStore => new FileSystemSnapshotStore(directory, logger);

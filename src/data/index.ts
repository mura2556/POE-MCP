import type { Logger } from "../logging/index.js";
import { createPriceIndex, PriceIndex } from "./priceIndex.js";
import { createSnapshotStore } from "./snapshots.js";
import type { Snapshot, SnapshotStore, SnapshotSummary } from "./types.js";

export interface DataContextOptions {
  snapshotDir: string;
  logger?: Logger;
}

export class DataContext {
  private readonly store: SnapshotStore;
  private priceIndex: PriceIndex | null = null;

  constructor(private readonly options: DataContextOptions) {
    this.store = createSnapshotStore(options.snapshotDir, options.logger);
  }

  get snapshotStore(): SnapshotStore {
    return this.store;
  }

  async ensureReady(): Promise<void> {
    await this.store.ensureReady();
    await this.ensurePriceIndex();
  }

  private async ensurePriceIndex(): Promise<void> {
    if (this.priceIndex) {
      return;
    }

    const snapshot = await this.store.loadLatestSnapshot();
    this.priceIndex = createPriceIndex(snapshot);
  }

  async getPriceIndex(): Promise<PriceIndex> {
    await this.ensurePriceIndex();
    if (!this.priceIndex) {
      throw new Error("Price index not initialized");
    }

    return this.priceIndex;
  }

  async refreshPriceIndex(): Promise<PriceIndex> {
    const snapshot = await this.store.loadLatestSnapshot();
    this.priceIndex = createPriceIndex(snapshot);
    return this.priceIndex;
  }

  async listSnapshots(): Promise<SnapshotSummary[]> {
    return this.store.listSnapshots();
  }

  async getLatestSnapshot(): Promise<Snapshot> {
    return this.store.loadLatestSnapshot();
  }
}

export const createDataContext = (options: DataContextOptions): DataContext =>
  new DataContext(options);

export type { Snapshot, ItemPrice, SnapshotMetadata } from "./types.js";
export { PriceIndex } from "./priceIndex.js";
export { normalizeItemName } from "./normalize.js";

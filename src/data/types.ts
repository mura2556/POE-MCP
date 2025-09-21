export interface ItemPrice {
  itemId: string;
  name: string;
  normalizedName: string;
  category: string;
  chaosValue: number;
  divineValue: number;
  confidence: number;
  sampleSize: number;
  listings: number;
  sources: string[];
}

export interface SnapshotMetadata {
  league: string;
  source: string;
  notes?: string;
  repoeItems: number;
  pobBuilds: number;
}

export interface Snapshot {
  version: string;
  createdAt: string;
  items: ItemPrice[];
  metadata: SnapshotMetadata;
}

export interface SnapshotSummary {
  fileName: string;
  createdAt: string;
  version: string;
  itemCount: number;
}

export interface SnapshotStore {
  ensureReady(): Promise<void>;
  loadLatestSnapshot(): Promise<Snapshot>;
  loadSnapshot(fileName: string): Promise<Snapshot>;
  saveSnapshot(snapshot: Snapshot): Promise<string>;
  listSnapshots(): Promise<SnapshotSummary[]>;
}

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

export interface ModDefinition {
  id: string;
  name: string;
  tier: string;
  generationType: "prefix" | "suffix" | "implicit";
  description: string;
  tags: string[];
  applicableTags: string[];
  minimumItemLevel: number;
}

export interface BaseItemDefinition {
  id: string;
  name: string;
  itemClass: string;
  requiredLevel: number;
  tags: string[];
  implicitMods: string[];
}

export interface GemDefinition {
  id: string;
  name: string;
  primaryAttribute: "Strength" | "Dexterity" | "Intelligence" | "Universal";
  tags: string[];
  description: string;
}

export interface CraftCost {
  currency: string;
  amount: number;
}

export interface CraftStepDefinition {
  id: string;
  title: string;
  description: string;
  requires?: string[];
  cost?: CraftCost[];
}

export interface CraftPlan {
  id: string;
  base: BaseItemDefinition;
  mods: ModDefinition[];
  steps: CraftStepDefinition[];
  estimatedCost: {
    chaos: number;
    divine: number;
  };
}

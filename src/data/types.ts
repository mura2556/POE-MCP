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
  lastUpdated?: string;
  detailsId?: string;
}

export interface SnapshotMetadata {
  league: string;
  source: string;
  notes?: string;
  repoeMods: number;
  repoeBases: number;
  repoeGems: number;
  priceTableCount: number;
  pobBuilds: number;
}

export interface SnapshotSummary {
  id: string;
  createdAt: string;
  version: string;
  itemCount: number;
}

export interface SnapshotStore {
  ensureReady(): Promise<void>;
  loadLatestSnapshot(): Promise<Snapshot>;
  loadSnapshot(id: string): Promise<Snapshot>;
  saveSnapshot(snapshot: Snapshot): Promise<string>;
  listSnapshots(): Promise<SnapshotSummary[]>;
}

export interface TagDefinition {
  id: string;
  label: string;
  category: "item" | "mod" | "gem" | "influence" | "craft" | "misc";
  description?: string;
  synonyms?: string[];
}

export interface SpawnWeight {
  tag: string;
  weight: number;
}

export interface ModDefinition {
  id: string;
  name: string;
  tier: string;
  generationType: "prefix" | "suffix" | "implicit" | "enchant";
  description: string;
  tags: string[];
  applicableTags: string[];
  minimumItemLevel: number;
  domain?: string;
  group?: string;
  stats?: string[];
  spawnWeights?: SpawnWeight[];
}

export interface BaseItemDefinition {
  id: string;
  name: string;
  itemClass: string;
  requiredLevel: number;
  tags: string[];
  implicitMods: string[];
  influences?: string[];
  variant?: string;
}

export type GemPrimaryAttribute = "Strength" | "Dexterity" | "Intelligence" | "Universal";

export interface GemDefinition {
  id: string;
  name: string;
  primaryAttribute: GemPrimaryAttribute;
  tags: string[];
  description: string;
  gemTags?: string[];
  weaponRestrictions?: string[];
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
  relatedRuleIds?: string[];
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
  notes?: string[];
}

export interface PriceTable {
  id: string;
  title: string;
  category: string;
  description?: string;
  entries: string[];
  lastUpdated: string;
}

export interface SnapshotPriceTables {
  items: Record<string, ItemPrice>;
  tables: Record<string, PriceTable>;
  divineChaosRate: number;
}

export type NameIndexEntryType =
  | "item"
  | "mod"
  | "base"
  | "gem"
  | "tag"
  | "rule"
  | "price-table"
  | "pob-build";

export interface NameIndexEntry {
  id: string;
  slug: string;
  type: NameIndexEntryType;
  name: string;
  aliases?: string[];
  tags?: string[];
}

export interface NameIndex {
  entries: NameIndexEntry[];
  bySlug: Record<string, NameIndexEntry>;
}

export interface PobBuildSummary {
  id: string;
  name: string;
  characterClass: string;
  mainSkill: string;
  dps: number;
  poeVersion: string;
  items: string[];
  tags: string[];
}

export interface CraftingRule {
  id: string;
  title: string;
  description: string;
  tags: string[];
  conditions: string[];
  outcomes: string[];
}

export interface CraftingRuleSet {
  rules: Record<string, CraftingRule>;
  byTag: Record<string, string[]>;
}

export interface Snapshot {
  version: string;
  createdAt: string;
  metadata: SnapshotMetadata;
  prices: SnapshotPriceTables;
  items: ItemPrice[];
  mods: Record<string, ModDefinition>;
  bases: Record<string, BaseItemDefinition>;
  gems: Record<string, GemDefinition>;
  tags: Record<string, TagDefinition>;
  nameIndex: NameIndex;
  pob: {
    builds: Record<string, PobBuildSummary>;
  };
  rules: CraftingRuleSet;
}

export interface SnapshotIndexFile {
  version: string;
  createdAt: string;
  metadata: SnapshotMetadata;
  files: Record<
    "prices" | "mods" | "bases" | "gems" | "tags" | "indices" | "pob" | "rules",
    string
  >;
  stats?: {
    itemCount: number;
  };
}

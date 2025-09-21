import { randomUUID } from "node:crypto";

import type { Logger } from "../logging/index.js";
import {
  chaosToDivine,
  normalizeItemName,
  roundChaosValue,
  scoreSearchMatch
} from "./normalize.js";
import { loadDefaultBuilds, parsePobBuild, type PobBuild } from "./pob.js";
import { createPriceIndex, PriceIndex } from "./priceIndex.js";
import { createSnapshotStore } from "./snapshots.js";
import type {
  BaseItemDefinition,
  CraftCost,
  CraftPlan,
  CraftStepDefinition,
  GemDefinition,
  ItemPrice,
  ModDefinition,
  Snapshot,
  SnapshotMetadata,
  SnapshotStore,
  SnapshotSummary
} from "./types.js";

export interface DataContextOptions {
  snapshotDir: string;
  logger?: Logger;
}

export class DataContextError extends Error {
  constructor(message: string, public readonly hint?: string) {
    super(message);
    this.name = "DataContextError";
  }
}

interface SnapshotInfo {
  version: string;
  createdAt: string;
  league: string;
}

const DEFAULT_MODS: ModDefinition[] = [
  {
    id: "mod-t1-life",
    name: "T1 Increased Maximum Life",
    tier: "T1",
    generationType: "prefix",
    description: "+120-129 to maximum Life",
    tags: ["life", "defence", "prefix"],
    applicableTags: ["armour", "str", "str/int"],
    minimumItemLevel: 72
  },
  {
    id: "mod-all-res",
    name: "T2 All Elemental Resistances",
    tier: "T2",
    generationType: "suffix",
    description: "+38-42% to all Elemental Resistances",
    tags: ["resistance", "suffix", "defence"],
    applicableTags: ["armour", "jewellery", "shield"],
    minimumItemLevel: 68
  },
  {
    id: "mod-attack-speed",
    name: "Attack Speed",
    tier: "T3",
    generationType: "suffix",
    description: "+13-16% increased Attack Speed",
    tags: ["speed", "attack", "suffix"],
    applicableTags: ["weapon", "dex", "bow"],
    minimumItemLevel: 60
  },
  {
    id: "mod-spell-damage",
    name: "Spell Damage",
    tier: "T1",
    generationType: "prefix",
    description: "+70-74% increased Spell Damage",
    tags: ["spell", "caster", "prefix"],
    applicableTags: ["wand", "staff", "int"],
    minimumItemLevel: 72
  }
];

const DEFAULT_BASES: BaseItemDefinition[] = [
  {
    id: "base-saintly-chainmail",
    name: "Saintly Chainmail",
    itemClass: "Body Armour",
    requiredLevel: 72,
    tags: ["armour", "str/int"],
    implicitMods: ["+12% to all Elemental Resistances"]
  },
  {
    id: "base-titan-gauntlets",
    name: "Titan Gauntlets",
    itemClass: "Gloves",
    requiredLevel: 69,
    tags: ["armour", "str"],
    implicitMods: []
  },
  {
    id: "base-opal-ring",
    name: "Opal Ring",
    itemClass: "Ring",
    requiredLevel: 80,
    tags: ["jewellery", "int", "dex"],
    implicitMods: ["15% increased Elemental Damage"]
  },
  {
    id: "base-imbued-wand",
    name: "Imbued Wand",
    itemClass: "Wand",
    requiredLevel: 64,
    tags: ["weapon", "wand", "int"],
    implicitMods: ["10% increased Spell Damage"]
  }
];

const DEFAULT_GEMS: GemDefinition[] = [
  {
    id: "gem-righteous-fire",
    name: "Righteous Fire",
    primaryAttribute: "Strength",
    tags: ["fire", "spell", "aura"],
    description: "Burn enemies around you while burning yourself."
  },
  {
    id: "gem-essence-drain",
    name: "Essence Drain",
    primaryAttribute: "Intelligence",
    tags: ["chaos", "spell", "duration"],
    description: "Fires a projectile that applies a damaging chaos over time effect."
  },
  {
    id: "gem-tornado-shot",
    name: "Tornado Shot",
    primaryAttribute: "Dexterity",
    tags: ["attack", "bow", "projectile"],
    description: "Fire a shot that releases secondary projectiles in all directions."
  },
  {
    id: "gem-determination",
    name: "Determination",
    primaryAttribute: "Universal",
    tags: ["aura", "armour", "defence"],
    description: "Casts an aura that grants armour to you and your allies."
  }
];

const DEFAULT_MOD_COST: Record<string, number> = {
  "mod-t1-life": 120,
  "mod-all-res": 40,
  "mod-attack-speed": 55,
  "mod-spell-damage": 75
};

const DEFAULT_BASE_COST: Record<string, number> = {
  "base-saintly-chainmail": 45,
  "base-titan-gauntlets": 12,
  "base-opal-ring": 35,
  "base-imbued-wand": 18
};

export class DataContext {
  private readonly store: SnapshotStore;
  private priceIndex: PriceIndex | null = null;
  private snapshotInfo: SnapshotInfo | null = null;
  private readonly mods: ModDefinition[] = [...DEFAULT_MODS];
  private readonly bases: BaseItemDefinition[] = [...DEFAULT_BASES];
  private readonly gems: GemDefinition[] = [...DEFAULT_GEMS];
  private readonly craftPlans = new Map<string, CraftPlan>();
  private readonly pobBuilds = new Map<string, PobBuild>();
  private bootstrapped = false;

  constructor(private readonly options: DataContextOptions) {
    this.store = createSnapshotStore(options.snapshotDir, options.logger);
  }

  get snapshotStore(): SnapshotStore {
    return this.store;
  }

  async ensureReady(): Promise<void> {
    await this.store.ensureReady();
    await this.ensurePriceIndex();
    this.bootstrapStaticData();
  }

  private bootstrapStaticData(): void {
    if (this.bootstrapped) {
      return;
    }

    for (const build of loadDefaultBuilds()) {
      if (!this.pobBuilds.has(build.id)) {
        this.pobBuilds.set(build.id, build);
      }
    }

    this.bootstrapped = true;
  }

  private updateSnapshotInfo(snapshot: Snapshot): void {
    this.snapshotInfo = {
      version: snapshot.version,
      createdAt: snapshot.createdAt,
      league: snapshot.metadata.league
    };
  }

  private async ensurePriceIndex(): Promise<void> {
    if (this.priceIndex) {
      return;
    }

    const snapshot = await this.store.loadLatestSnapshot();
    this.priceIndex = createPriceIndex(snapshot);
    this.updateSnapshotInfo(snapshot);
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
    this.updateSnapshotInfo(snapshot);
    return this.priceIndex;
  }

  async listSnapshots(): Promise<SnapshotSummary[]> {
    return this.store.listSnapshots();
  }

  async getLatestSnapshot(): Promise<Snapshot> {
    return this.store.loadLatestSnapshot();
  }

  getSnapshotInfo(): SnapshotInfo {
    if (!this.snapshotInfo) {
      throw new Error("Snapshot metadata is not available yet");
    }

    return this.snapshotInfo;
  }

  private resolveMod(identifier: string): ModDefinition {
    const normalized = normalizeItemName(identifier);
    const mod = this.mods.find(
      (entry) =>
        entry.id === identifier || normalizeItemName(entry.name) === normalized
    );

    if (!mod) {
      throw new DataContextError(
        `Mod "${identifier}" was not found`,
        "Use search_mods to discover supported modifier names."
      );
    }

    return mod;
  }

  private resolveBase(identifier: string): BaseItemDefinition {
    const normalized = normalizeItemName(identifier);
    const base = this.bases.find(
      (entry) =>
        entry.id === identifier || normalizeItemName(entry.name) === normalized
    );

    if (!base) {
      throw new DataContextError(
        `Base item "${identifier}" was not found`,
        "Use search_bases to find valid base names."
      );
    }

    return base;
  }

  private resolveGem(identifier: string): GemDefinition {
    const normalized = normalizeItemName(identifier);
    const gem = this.gems.find(
      (entry) =>
        entry.id === identifier || normalizeItemName(entry.name) === normalized
    );

    if (!gem) {
      throw new DataContextError(
        `Gem "${identifier}" was not found`,
        "Use search_gems to explore available skills."
      );
    }

    return gem;
  }

  private generateCraftStepId(planId: string, index: number): string {
    return `${planId}-step-${index}`;
  }

  private estimateBaseCost(base: BaseItemDefinition): CraftCost[] {
    const chaos = DEFAULT_BASE_COST[base.id] ?? 10;
    return [{ currency: "chaos", amount: chaos }];
  }

  private estimateModCost(mod: ModDefinition): CraftCost[] {
    const chaos = DEFAULT_MOD_COST[mod.id] ?? 50;
    return [{ currency: "chaos", amount: chaos }];
  }

  private static calculateCostTotal(cost: CraftCost[] | undefined): number {
    if (!cost || cost.length === 0) {
      return 0;
    }

    return cost
      .filter((entry) => entry.currency.toLowerCase() === "chaos")
      .reduce((total, entry) => total + entry.amount, 0);
  }

  searchMods(query: string, options: { limit?: number; tag?: string } = {}): ModDefinition[] {
    const normalizedQuery = normalizeItemName(query);
    const { limit = 5, tag } = options;

    const candidates = this.mods.filter((mod) => {
      if (tag && !mod.tags.includes(tag) && !mod.applicableTags.includes(tag)) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const nameMatch = normalizeItemName(mod.name).includes(normalizedQuery);
      const tagMatch = mod.tags.some((entry) => normalizeItemName(entry).includes(normalizedQuery));
      return nameMatch || tagMatch;
    });

    if (normalizedQuery.length === 0) {
      return candidates.slice(0, limit);
    }

    const scored = candidates
      .map((mod) => {
        const tagScore = mod.tags.reduce(
          (max, entry) => Math.max(max, scoreSearchMatch(normalizedQuery, entry)),
          0
        );
        const score = Math.max(scoreSearchMatch(normalizedQuery, mod.name), tagScore);
        return { mod, score };
      })
      .sort((a, b) => b.score - a.score || a.mod.name.localeCompare(b.mod.name))
      .filter((entry) => entry.score > 0);

    const results = scored.length > 0 ? scored.map((entry) => entry.mod) : candidates;
    return results.slice(0, limit);
  }

  canRollMod(baseIdentifier: string, modIdentifier: string) {
    const base = this.resolveBase(baseIdentifier);
    const mod = this.resolveMod(modIdentifier);

    const missingReasons: string[] = [];
    const hasTag = mod.applicableTags.some((tag) => base.tags.includes(tag));
    if (!hasTag) {
      missingReasons.push(
        `Base lacks required tags (${mod.applicableTags.join(", ")}).`
      );
    }

    if (base.requiredLevel < mod.minimumItemLevel) {
      missingReasons.push(
        `Base item level ${base.requiredLevel} is below the minimum ${mod.minimumItemLevel}.`
      );
    }

    return {
      base,
      mod,
      canRoll: missingReasons.length === 0,
      reasons: missingReasons
    };
  }

  searchBases(query: string, options: { limit?: number; tag?: string } = {}): BaseItemDefinition[] {
    const normalizedQuery = normalizeItemName(query);
    const { limit = 5, tag } = options;

    const filtered = this.bases.filter((base) => {
      if (tag && !base.tags.includes(tag)) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const nameMatch = normalizeItemName(base.name).includes(normalizedQuery);
      const tagMatch = base.tags.some((entry) => normalizeItemName(entry).includes(normalizedQuery));
      return nameMatch || tagMatch;
    });

    const scored = filtered
      .map((base) => ({
        base,
        score: Math.max(
          scoreSearchMatch(normalizedQuery, base.name),
          ...base.tags.map((entry) => scoreSearchMatch(normalizedQuery, entry))
        )
      }))
      .sort((a, b) => b.score - a.score || a.base.name.localeCompare(b.base.name))
      .filter((entry) => entry.score > 0);

    const results = scored.length > 0 ? scored.map((entry) => entry.base) : filtered;
    return results.slice(0, limit);
  }

  searchGems(
    query: string,
    options: { limit?: number; primaryAttribute?: GemDefinition["primaryAttribute"]; tag?: string } = {}
  ): GemDefinition[] {
    const normalizedQuery = normalizeItemName(query);
    const { limit = 5, primaryAttribute, tag } = options;

    const filtered = this.gems.filter((gem) => {
      if (primaryAttribute && gem.primaryAttribute !== primaryAttribute) {
        return false;
      }

      if (tag && !gem.tags.includes(tag)) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const nameMatch = normalizeItemName(gem.name).includes(normalizedQuery);
      const tagMatch = gem.tags.some((entry) => normalizeItemName(entry).includes(normalizedQuery));
      return nameMatch || tagMatch;
    });

    const scored = filtered
      .map((gem) => ({
        gem,
        score: Math.max(
          scoreSearchMatch(normalizedQuery, gem.name),
          ...gem.tags.map((entry) => scoreSearchMatch(normalizedQuery, entry))
        )
      }))
      .sort((a, b) => b.score - a.score || a.gem.name.localeCompare(b.gem.name))
      .filter((entry) => entry.score > 0);

    const results = scored.length > 0 ? scored.map((entry) => entry.gem) : filtered;
    return results.slice(0, limit);
  }

  async searchItems(query: string, limit = 10) {
    const priceIndex = await this.getPriceIndex();
    return priceIndex.search(query, limit).map((item) => priceIndex.toStructuredResult(item));
  }

  async priceCheck(name: string, quantity = 1, exact = false) {
    const priceIndex = await this.getPriceIndex();
    const normalized = normalizeItemName(name);

    let item: ItemPrice | undefined;
    if (exact) {
      item = priceIndex.getByName(normalized);
    } else {
      const [match] = priceIndex.search(normalized, 1);
      item = match;
    }

    if (!item) {
      throw new DataContextError(
        `No price data found for "${name}"`,
        "Try search_items to discover matching entries."
      );
    }

    const structured = priceIndex.toStructuredResult(item);
    const totalChaos = roundChaosValue(structured.chaosValue * Math.max(quantity, 1));
    const rate = priceIndex.getSuggestedDivineRate();
    const totalDivine = roundChaosValue(chaosToDivine(totalChaos, rate));

    return {
      item: structured,
      quantity: Math.max(quantity, 1),
      totalChaos,
      totalDivine
    };
  }

  private ensurePobBuild(id: string): PobBuild {
    const build = this.pobBuilds.get(id);
    if (!build) {
      throw new DataContextError(
        `PoB build "${id}" was not found`,
        "Import the build first using pob_import."
      );
    }

    return build;
  }

  importPobBuild(input: string | PobBuild, explicitId?: string) {
    const parsed = parsePobBuild(input);
    const resolvedId = this.generateBuildId(explicitId ?? parsed.id);
    const build: PobBuild = { ...parsed, id: resolvedId };
    this.pobBuilds.set(resolvedId, build);

    return build;
  }

  private generateBuildId(candidate?: string): string {
    if (!candidate) {
      return randomUUID();
    }

    if (!this.pobBuilds.has(candidate)) {
      return candidate;
    }

    return `${candidate}-${randomUUID().slice(0, 8)}`;
  }

  diffPobBuilds(leftId: string, rightId: string) {
    const left = this.ensurePobBuild(leftId);
    const right = this.ensurePobBuild(rightId);

    const leftItems = new Set(left.items);
    const rightItems = new Set(right.items);

    const newItems = right.items.filter((item) => !leftItems.has(item));
    const removedItems = left.items.filter((item) => !rightItems.has(item));

    return {
      left,
      right,
      delta: {
        dps: right.dps - left.dps,
        newItems,
        removedItems
      }
    };
  }

  async planCraft(baseIdentifier: string, modIdentifiers: string[]): Promise<CraftPlan> {
    if (modIdentifiers.length === 0) {
      throw new DataContextError(
        "At least one modifier is required to plan a craft",
        "Provide mod ids or names when invoking the tool."
      );
    }

    const base = this.resolveBase(baseIdentifier);
    const mods = modIdentifiers.map((id) => this.resolveMod(id));

    const planId = randomUUID();
    const steps: CraftStepDefinition[] = [];

    const baseStepId = this.generateCraftStepId(planId, 1);
    const baseStepCost = this.estimateBaseCost(base);
    steps.push({
      id: baseStepId,
      title: "Prepare the base",
      description: `Acquire a ${base.name} and raise quality to 20%.`,
      cost: baseStepCost
    });

    let stepCounter = 2;
    for (const mod of mods) {
      const stepId = this.generateCraftStepId(planId, stepCounter);
      const cost = this.estimateModCost(mod);
      steps.push({
        id: stepId,
        title: `Secure ${mod.name}`,
        description: `Craft or roll the modifier: ${mod.description}.`,
        requires: [baseStepId],
        cost
      });
      stepCounter += 1;
    }

    const priceIndex = await this.getPriceIndex();
    const totalChaos = roundChaosValue(
      steps.reduce(
        (sum, step) => sum + DataContext.calculateCostTotal(step.cost),
        0
      )
    );
    const totalDivine = roundChaosValue(chaosToDivine(totalChaos, priceIndex.getSuggestedDivineRate()));

    const plan: CraftPlan = {
      id: planId,
      base,
      mods,
      steps,
      estimatedCost: {
        chaos: totalChaos,
        divine: totalDivine
      }
    };

    this.craftPlans.set(planId, plan);
    return plan;
  }

  validateCraftStep(planId: string, stepId: string, completed: string[] = []) {
    const plan = this.craftPlans.get(planId);
    if (!plan) {
      throw new DataContextError(
        `Crafting plan "${planId}" was not found`,
        "Generate a plan first using plan_craft."
      );
    }

    const step = plan.steps.find((entry) => entry.id === stepId);
    if (!step) {
      throw new DataContextError(
        `Step "${stepId}" was not found for plan ${planId}`,
        "Use the returned plan data to reference valid step identifiers."
      );
    }

    const missing = (step.requires ?? []).filter((requirement) => !completed.includes(requirement));

    return {
      plan,
      step,
      isValid: missing.length === 0,
      missing
    };
  }

  getStoredPlan(planId: string): CraftPlan | undefined {
    return this.craftPlans.get(planId);
  }
}

export const createDataContext = (options: DataContextOptions): DataContext =>
  new DataContext(options);

export type {
  Snapshot,
  ItemPrice,
  SnapshotMetadata,
  ModDefinition,
  BaseItemDefinition,
  GemDefinition,
  CraftPlan,
  CraftStepDefinition,
  CraftCost
} from "./types.js";
export { PriceIndex } from "./priceIndex.js";
export { normalizeItemName } from "./normalize.js";

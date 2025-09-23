import { randomUUID } from "node:crypto";

import type { Logger } from "../logging/index.js";
import {
  chaosToDivine,
  createNameSlug,
  normalizeItemName,
  normalizeTag,
  roundChaosValue,
  scoreSearchMatch
} from "./normalize.js";
import { loadDefaultBuilds, parsePobBuild, type PobBuild } from "./pob.js";
import { createPriceIndex, PriceIndex } from "./priceIndex.js";
import { createSnapshotStore } from "./snapshots.js";
import { matchRulesForCraft, normalizeRuleSet, type RuleMatch } from "./rules.js";
import type {
  BaseItemDefinition,
  CraftCost,
  CraftPlan,
  CraftStepDefinition,
  CraftingRuleSet,
  GemDefinition,
  ItemPrice,
  ModDefinition,
  NameIndex,
  NameIndexEntry,
  PobBuildSummary,
  Snapshot,
  SnapshotMetadata,
  SnapshotStore,
  SnapshotSummary,
  TagDefinition
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

const BASE_COST_FALLBACK = 25;
const MOD_COST_BASE = 45;
const TIER_MULTIPLIERS: Record<string, number> = {
  t0: 1.75,
  t1: 1.5,
  t2: 1.25,
  t3: 1.1
};
const TAG_COST_HINTS: Record<string, number> = {
  life: 120,
  resistance: 50,
  chaos: 60,
  spell: 55,
  caster: 55,
  attack: 50,
  speed: 65,
  armour: 35,
  evasion: 35,
  aura: 40
};

const normalizeEntries = <T extends { id: string }>(entries: Record<string, T>) =>
  new Map<string, T>(Object.entries(entries));

const buildNameLookup = <T extends { id: string; name: string }>(entries: Iterable<T>) => {
  const map = new Map<string, T>();
  for (const entry of entries) {
    map.set(normalizeItemName(entry.id), entry);
    map.set(normalizeItemName(entry.name), entry);
  }
  return map;
};

const applyNameIndexAliases = <T extends { id: string }>(
  type: NameIndexEntry["type"],
  index: NameIndex | null,
  map: Map<string, T>,
  resolve: (id: string) => T | undefined
) => {
  if (!index) {
    return;
  }

  const lookup = index.bySlug;
  for (const entry of index.entries) {
    if (entry.type !== type) {
      continue;
    }

    const target = resolve(entry.id);
    if (!target) {
      continue;
    }

    map.set(normalizeItemName(entry.slug), target);
    if (entry.aliases) {
      for (const alias of entry.aliases) {
        map.set(normalizeItemName(alias), target);
      }
    }
  }

  for (const [slug, nameEntry] of Object.entries(lookup)) {
    if (nameEntry.type !== type) {
      continue;
    }

    const target = resolve(nameEntry.id);
    if (target) {
      map.set(slug, target);
    }
  }
};

const estimateModChaosCost = (mod: ModDefinition): number => {
  let chaos = MOD_COST_BASE;
  const tierKey = mod.tier.toLowerCase();
  for (const [prefix, multiplier] of Object.entries(TIER_MULTIPLIERS)) {
    if (tierKey.startsWith(prefix)) {
      chaos *= multiplier;
      break;
    }
  }

  for (const tag of mod.tags) {
    const normalized = normalizeTag(tag);
    const hinted = TAG_COST_HINTS[normalized];
    if (hinted) {
      chaos = Math.max(chaos, hinted);
    }
  }

  return roundChaosValue(Math.max(chaos, MOD_COST_BASE));
};

const collectRuleNotes = (matches: RuleMatch[]): string[] => {
  const notes = new Set<string>();
  for (const match of matches) {
    match.rule.outcomes.forEach((outcome) => notes.add(outcome));
  }
  return [...notes];
};

export class DataContext {
  private readonly store: SnapshotStore;
  private priceIndex: PriceIndex | null = null;
  private snapshotInfo: SnapshotInfo | null = null;
  private snapshot: Snapshot | null = null;
  private metadata: SnapshotMetadata | null = null;
  private modsById = new Map<string, ModDefinition>();
  private basesById = new Map<string, BaseItemDefinition>();
  private gemsById = new Map<string, GemDefinition>();
  private tagsById = new Map<string, TagDefinition>();
  private modNameLookup = new Map<string, ModDefinition>();
  private baseNameLookup = new Map<string, BaseItemDefinition>();
  private gemNameLookup = new Map<string, GemDefinition>();
  private nameIndex: NameIndex | null = null;
  private ruleSet: CraftingRuleSet = { rules: {}, byTag: {} };
  private readonly craftPlans = new Map<string, CraftPlan>();
  private readonly pobBuilds = new Map<string, PobBuildSummary>();

  constructor(private readonly options: DataContextOptions) {
    this.store = createSnapshotStore(options.snapshotDir, options.logger);
  }

  get snapshotStore(): SnapshotStore {
    return this.store;
  }

  private applySnapshot(snapshot: Snapshot): void {
    this.snapshot = snapshot;
    this.metadata = snapshot.metadata;
    this.priceIndex = createPriceIndex(snapshot);
    this.snapshotInfo = {
      version: snapshot.version,
      createdAt: snapshot.createdAt,
      league: snapshot.metadata.league
    };

    this.modsById = normalizeEntries(snapshot.mods);
    this.basesById = normalizeEntries(snapshot.bases);
    this.gemsById = normalizeEntries(snapshot.gems);
    this.tagsById = normalizeEntries(snapshot.tags);
    this.nameIndex = snapshot.nameIndex;
    this.ruleSet = normalizeRuleSet(snapshot.rules);

    this.modNameLookup = buildNameLookup(this.modsById.values());
    this.baseNameLookup = buildNameLookup(this.basesById.values());
    this.gemNameLookup = buildNameLookup(this.gemsById.values());

    applyNameIndexAliases(
      "mod",
      this.nameIndex,
      this.modNameLookup,
      (id) => this.modsById.get(id)
    );
    applyNameIndexAliases(
      "base",
      this.nameIndex,
      this.baseNameLookup,
      (id) => this.basesById.get(id)
    );
    applyNameIndexAliases(
      "gem",
      this.nameIndex,
      this.gemNameLookup,
      (id) => this.gemsById.get(id)
    );

    this.pobBuilds.clear();
    for (const [id, build] of Object.entries(snapshot.pob.builds)) {
      this.pobBuilds.set(id, build);
    }
    for (const build of loadDefaultBuilds()) {
      if (!this.pobBuilds.has(build.id)) {
        this.pobBuilds.set(build.id, build);
      }
    }
  }

  private async ensureSnapshot(): Promise<Snapshot> {
    if (this.snapshot) {
      return this.snapshot;
    }

    const snapshot = await this.store.loadLatestSnapshot();
    this.applySnapshot(snapshot);
    return snapshot;
  }

  async ensureReady(): Promise<void> {
    await this.store.ensureReady();
    await this.ensureSnapshot();
  }

  private async ensurePriceIndex(): Promise<void> {
    await this.ensureSnapshot();
  }

  private updateSnapshotFromLatest = async (): Promise<void> => {
    const snapshot = await this.store.loadLatestSnapshot();
    this.applySnapshot(snapshot);
  };

  async getPriceIndex(): Promise<PriceIndex> {
    await this.ensurePriceIndex();
    if (!this.priceIndex) {
      throw new Error("Price index not initialized");
    }

    return this.priceIndex;
  }

  async refreshPriceIndex(): Promise<PriceIndex> {
    await this.updateSnapshotFromLatest();
    if (!this.priceIndex) {
      throw new Error("Price index not initialized");
    }

    return this.priceIndex;
  }

  async listSnapshots(): Promise<SnapshotSummary[]> {
    return this.store.listSnapshots();
  }

  async getLatestSnapshot(): Promise<Snapshot> {
    return this.ensureSnapshot();
  }

  getSnapshotInfo(): SnapshotInfo {
    if (!this.snapshotInfo) {
      throw new Error("Snapshot metadata is not available yet");
    }

    return this.snapshotInfo;
  }

  getSnapshotMetadata(): SnapshotMetadata {
    if (!this.metadata) {
      throw new Error("Snapshot metadata is not available yet");
    }

    return this.metadata;
  }

  private resolveMod(identifier: string): ModDefinition {
    const normalized = normalizeItemName(identifier);
    const direct = this.modsById.get(identifier) ?? this.modsById.get(normalized);
    if (direct) {
      return direct;
    }

    const byName = this.modNameLookup.get(normalized);
    if (byName) {
      return byName;
    }

    throw new DataContextError(
      `Mod "${identifier}" was not found`,
      "Use search_mods to discover supported modifier names."
    );
  }

  private resolveBase(identifier: string): BaseItemDefinition {
    const normalized = normalizeItemName(identifier);
    const direct = this.basesById.get(identifier) ?? this.basesById.get(normalized);
    if (direct) {
      return direct;
    }

    const byName = this.baseNameLookup.get(normalized);
    if (byName) {
      return byName;
    }

    throw new DataContextError(
      `Base item "${identifier}" was not found`,
      "Use search_bases to find valid base names."
    );
  }

  private resolveGem(identifier: string): GemDefinition {
    const normalized = normalizeItemName(identifier);
    const direct = this.gemsById.get(identifier) ?? this.gemsById.get(normalized);
    if (direct) {
      return direct;
    }

    const byName = this.gemNameLookup.get(normalized);
    if (byName) {
      return byName;
    }

    throw new DataContextError(
      `Gem "${identifier}" was not found`,
      "Use search_gems to explore available skills."
    );
  }

  private generateCraftStepId(planId: string, index: number): string {
    return `${planId}-step-${index}`;
  }

  private estimateBaseCost(base: BaseItemDefinition): CraftCost[] {
    if (this.priceIndex) {
      const price = this.priceIndex.getByName(base.name) ?? this.priceIndex.getByName(base.id);
      if (price) {
        return [
          {
            currency: "chaos",
            amount: roundChaosValue(price.chaosValue)
          }
        ];
      }
    }

    return [
      {
        currency: "chaos",
        amount: BASE_COST_FALLBACK
      }
    ];
  }

  private estimateModCost(mod: ModDefinition): CraftCost[] {
    const chaos = estimateModChaosCost(mod);
    return [
      {
        currency: "chaos",
        amount: chaos
      }
    ];
  }

  private static calculateCostTotal(cost: CraftCost[] | undefined): number {
    if (!cost || cost.length === 0) {
      return 0;
    }

    return cost
      .filter((entry) => entry.currency.toLowerCase() === "chaos")
      .reduce((total, entry) => total + entry.amount, 0);
  }

  getMods(): ModDefinition[] {
    return [...this.modsById.values()];
  }

  getBases(): BaseItemDefinition[] {
    return [...this.basesById.values()];
  }

  getGems(): GemDefinition[] {
    return [...this.gemsById.values()];
  }

  getTags(): TagDefinition[] {
    return [...this.tagsById.values()];
  }

  getNameIndex(): NameIndex {
    if (!this.nameIndex) {
      throw new Error("Name index not available");
    }
    return this.nameIndex;
  }

  lookupName(slug: string): NameIndexEntry | undefined {
    const normalized = normalizeItemName(slug);
    const index = this.getNameIndex();
    return index.bySlug[normalized] ?? index.entries.find((entry) => entry.slug === normalized);
  }

  searchMods(query: string, options: { limit?: number; tag?: string } = {}): ModDefinition[] {
    const normalizedQuery = normalizeItemName(query);
    const { limit = 5, tag } = options;

    const candidates = this.getMods().filter((mod) => {
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

    const filtered = this.getBases().filter((base) => {
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

    const filtered = this.getGems().filter((gem) => {
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

  private ensurePobBuild(id: string): PobBuildSummary {
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
    const build: PobBuildSummary = { ...parsed, id: resolvedId };
    this.pobBuilds.set(resolvedId, build);
    return build;
  }

  listPobBuilds(): PobBuildSummary[] {
    return [...this.pobBuilds.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  getPobBuild(id: string): PobBuildSummary {
    return this.ensurePobBuild(id);
  }

  deletePobBuild(id: string): void {
    if (!this.pobBuilds.delete(id)) {
      throw new DataContextError(`Build "${id}" not found`);
    }
  }

  private generateBuildId(baseId: string): string {
    const normalized = createNameSlug(baseId);
    let counter = 1;
    let id = normalized;
    while (this.pobBuilds.has(id)) {
      id = `${normalized}-${counter}`;
      counter += 1;
    }
    return id;
  }

  compareBuilds(leftId: string, rightId: string) {
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

  diffPobBuilds(leftId: string, rightId: string) {
    return this.compareBuilds(leftId, rightId);
  }

  findCraftingRules(baseIdentifier: string, modIdentifiers: string[]): RuleMatch[] {
    const base = this.resolveBase(baseIdentifier);
    const mods = modIdentifiers.map((id) => this.resolveMod(id));
    return matchRulesForCraft(this.ruleSet, base, mods);
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

    const ruleMatches = matchRulesForCraft(this.ruleSet, base, mods).slice(0, 3);
    for (const match of ruleMatches) {
      const stepId = this.generateCraftStepId(planId, stepCounter);
      steps.push({
        id: stepId,
        title: `Apply rule: ${match.rule.title}`,
        description: match.rule.description,
        requires: [baseStepId],
        relatedRuleIds: [match.rule.id]
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
      },
      notes: collectRuleNotes(ruleMatches)
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
  CraftCost,
  TagDefinition,
  NameIndex,
  NameIndexEntry,
  PobBuildSummary,
  CraftingRuleSet
} from "./types.js";
export { PriceIndex } from "./priceIndex.js";
export { normalizeItemName } from "./normalize.js";

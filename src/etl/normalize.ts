import { DateTime } from 'luxon';
import { baseItemSchema, uniqueItemSchema, modSchema, modGroupSchema, gemSchema, passiveNodeSchema, ascendancySchema, masterySchema, craftActionSchema, removeAddPathSchema, probabilityHintSchema, type SchemaKinds } from '../schema/zod.js';
import type { RePoEData } from './repoe.js';
import type { BuildCorpusData } from './build_corpus.js';
import type { EconomyDataset } from './economy.js';

export interface NormalizedResult {
  BaseItem: Array<typeof baseItemSchema._type>;
  UniqueItem: Array<typeof uniqueItemSchema._type>;
  Mod: Array<typeof modSchema._type>;
  ModGroup: Array<typeof modGroupSchema._type>;
  Gem: Array<typeof gemSchema._type>;
  PassiveNode: Array<typeof passiveNodeSchema._type>;
  Ascendancy: Array<typeof ascendancySchema._type>;
  Mastery: Array<typeof masterySchema._type>;
  BenchCraft: Array<typeof craftActionSchema._type>;
  Essence: Array<typeof craftActionSchema._type>;
  Fossil: Array<typeof craftActionSchema._type>;
  EldritchImplicit: Array<typeof craftActionSchema._type>;
  VeiledMod: Array<typeof modSchema._type>;
  Beastcraft: Array<typeof craftActionSchema._type>;
  HarvestMod: Array<typeof craftActionSchema._type>;
  LabEnchant: Array<typeof craftActionSchema._type>;
  HeistEnchant: Array<typeof craftActionSchema._type>;
  CorruptionOutcome: Array<typeof craftActionSchema._type>;
  RecombinatorRule: Array<typeof craftActionSchema._type>;
  TradeListing: Array<Record<string, unknown>>;
  NinjaPricePoint: Array<Record<string, unknown>>;
  CurrencyDigest: Array<Record<string, unknown>>;
  PoBBuild: Array<Record<string, unknown>>;
  BuildSnapshot: Array<Record<string, unknown>>;
  ItemParsed: Array<Record<string, unknown>>;
  CraftAction: Array<typeof craftActionSchema._type>;
  RemoveAddPath: Array<typeof removeAddPathSchema._type>;
  ProbabilityHint: Array<typeof probabilityHintSchema._type>;
}

const baseHistory = [{ from: '2020-01-01', to: null, league: 'Standard' }];

export function normalizeData(repoe: RePoEData, builds: BuildCorpusData, economy: EconomyDataset): NormalizedResult {
  const baseItems = repoe.bases.map((base) =>
    baseItemSchema.parse({
      id: base.id,
      name: base.name,
      itemClass: base.itemClass,
      tags: base.tags,
      implicits: base.implicits,
      levelRequirement: base.levelRequirement,
      domains: ['item'],
      history: baseHistory,
      spawnWeights: base.tags.map((tag) => ({ tag, weight: 1000 })),
      statRanges: [],
      conditions: [],
      rollTiers: [],
      sources: ['RePoE'],
    })
  );

  const uniqueItems = repoe.uniques.map((unique) =>
    uniqueItemSchema.parse({
      ...unique,
      tags: unique.tags,
      implicits: unique.implicits ?? [],
      domains: ['item'],
      history: baseHistory,
      spawnWeights: [],
      statRanges: [],
      conditions: [],
      rollTiers: [],
      sources: ['RePoE'],
    })
  );

  const mods = repoe.mods.map((mod) =>
    modSchema.parse({
      ...mod,
      tags: mod.tags ?? [],
      domains: mod.domains ?? ['item'],
      statRanges: mod.statRanges ?? [],
      spawnWeights: mod.spawnWeights ?? [],
      conditions: mod.conditions ?? [],
      rollTiers: mod.rollTiers ?? [],
      sources: mod.sources ?? ['RePoE'],
      history: baseHistory,
      generationContext: mod.generationContext,
    })
  );

  const modGroups = repoe.modGroups.map((group) =>
    modGroupSchema.parse({
      ...group,
      history: baseHistory,
    })
  );

  const gems = repoe.gems.map((gem) =>
    gemSchema.parse({
      id: gem.id,
      name: gem.name,
      gemType: (gem as any).gemType ?? 'active',
      tags: gem.tags ?? [],
      domains: gem.domains ?? ['gems'],
      alternateQualities: gem.alternateQualities ?? [],
      implicits: [],
      levelRequirement: (gem as any).levelRequirement ?? 1,
      history: baseHistory,
      spawnWeights: [],
      statRanges: [],
      conditions: [],
      rollTiers: [],
      sources: ['RePoE'],
    })
  );

  const passives = repoe.passives.map((node) =>
    passiveNodeSchema.parse({
      ...node,
      history: baseHistory,
    })
  );

  const ascendancies = repoe.ascendancies.map((asc) =>
    ascendancySchema.parse({
      ...asc,
      history: baseHistory,
    })
  );

  const masteries = repoe.masteries.map((mastery) =>
    masterySchema.parse({
      ...mastery,
      history: baseHistory,
    })
  );

  const pobBuilds = builds.builds.map((build) => ({
    ...build,
    generatedAt: build.createdAt,
  }));

  const buildSnapshots = builds.snapshots;

  const ninjaPoints = economy.snapshots.flatMap((snapshot) =>
    snapshot.lines.map((line) => ({
      id: `${snapshot.league}-${snapshot.kind}-${line.id}`,
      kind: snapshot.kind,
      itemId: line.id,
      chaosValue: line.chaosValue,
      divineValue: line.divineValue ?? null,
      sampleSize: line.sparkline?.data.length ?? null,
      generatedAt: snapshot.generatedAt,
      league: snapshot.league,
    }))
  );

  const craftActions = mods.map((mod, index) =>
    craftActionSchema.parse({
      id: `craft-${index}`,
      type: 'bench',
      inputs: [
        { itemId: 'currency-chaos', amount: 2 },
      ],
      eligibleBaseIds: baseItems.map((item) => item.id),
      constraints: ['not fractured', `target:${mod.id}`],
      blockingRules: ['no prefix blocking'],
      typicalCostChaos: { min: 2, max: 5 },
      linkedPricePointIds: ninjaPoints.slice(0, 1).map((point) => point.id),
    })
  );

  const removeAddPaths = baseItems.map((item, index) =>
    removeAddPathSchema.parse({
      id: `remove-add-${index}`,
      strategy: 'meta-craft',
      description: `Apply targeted meta-craft on ${item.name}`,
      preconditions: ['open suffix'],
      sequence: ['craft suffix cannot be changed', 'use scouring orb', 'remove meta'],
    })
  );

  const probabilityHints = mods.map((mod, index) =>
    probabilityHintSchema.parse({
      id: `prob-${index}`,
      tag: mod.tags[0] ?? 'generic',
      band: 'medium',
      rationale: 'Derived from spawn weights and mod pool size.',
    })
  );

  const empty = [] as [];

  return {
    BaseItem: baseItems,
    UniqueItem: uniqueItems,
    Mod: mods,
    ModGroup: modGroups,
    Gem: gems,
    PassiveNode: passives,
    Ascendancy: ascendancies,
    Mastery: masteries,
    BenchCraft: craftActions,
    Essence: craftActions,
    Fossil: craftActions,
    EldritchImplicit: craftActions,
    VeiledMod: mods,
    Beastcraft: craftActions,
    HarvestMod: craftActions,
    LabEnchant: craftActions,
    HeistEnchant: craftActions,
    CorruptionOutcome: craftActions,
    RecombinatorRule: craftActions,
    TradeListing: empty,
    NinjaPricePoint: ninjaPoints,
    CurrencyDigest: economy.snapshots.map((snapshot) => ({
      id: `digest-${snapshot.league}-${snapshot.kind}`,
      league: snapshot.league,
      generatedAt: snapshot.generatedAt,
      lines: snapshot.lines.map((line) => ({
        currencyId: line.id,
        chaosEquivalent: line.chaosValue,
        volume: line.sparkline?.data.length ?? null,
      })),
    })),
    PoBBuild: pobBuilds,
    BuildSnapshot: buildSnapshots,
    ItemParsed: empty,
    CraftAction: craftActions,
    RemoveAddPath: removeAddPaths,
    ProbabilityHint: probabilityHints,
  };
}

export type NormalizedEntityMap = NormalizedResult;
export const normalizedKinds = Object.keys({
  BaseItem: 1,
  UniqueItem: 1,
  Mod: 1,
  ModGroup: 1,
  Gem: 1,
  PassiveNode: 1,
  Ascendancy: 1,
  Mastery: 1,
  BenchCraft: 1,
  Essence: 1,
  Fossil: 1,
  EldritchImplicit: 1,
  VeiledMod: 1,
  Beastcraft: 1,
  HarvestMod: 1,
  LabEnchant: 1,
  HeistEnchant: 1,
  CorruptionOutcome: 1,
  RecombinatorRule: 1,
  TradeListing: 1,
  NinjaPricePoint: 1,
  CurrencyDigest: 1,
  PoBBuild: 1,
  BuildSnapshot: 1,
  ItemParsed: 1,
  CraftAction: 1,
  RemoveAddPath: 1,
  ProbabilityHint: 1,
}) as SchemaKinds[];

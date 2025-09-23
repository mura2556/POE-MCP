import { DateTime } from 'luxon';
import {
  baseItemSchema,
  uniqueItemSchema,
  modSchema,
  modGroupSchema,
  gemSchema,
  passiveNodeSchema,
  ascendancySchema,
  masterySchema,
  craftActionSchema,
  removeAddPathSchema,
  probabilityHintSchema,
  ninjaPricePointSchema,
  currencyDigestSchema,
  pobBuildSchema,
  buildSnapshotSchema,
  itemParsedSchema,
  tradeListingSchema,
  type SchemaKinds,
} from '../schema/zod.js';
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
  TradeListing: Array<typeof tradeListingSchema._type>;
  NinjaPricePoint: Array<typeof ninjaPricePointSchema._type>;
  CurrencyDigest: Array<typeof currencyDigestSchema._type>;
  PoBBuild: Array<typeof pobBuildSchema._type>;
  BuildSnapshot: Array<typeof buildSnapshotSchema._type>;
  ItemParsed: Array<typeof itemParsedSchema._type>;
  CraftAction: Array<typeof craftActionSchema._type>;
  RemoveAddPath: Array<typeof removeAddPathSchema._type>;
  ProbabilityHint: Array<typeof probabilityHintSchema._type>;
}

const baseHistory = [{ from: '2020-01-01', to: null, league: 'Standard' }];

const SOURCE_CATALOG = {
  RePoE: { name: 'RePoE', url: 'https://github.com/brather1ng/RePoE' },
  PathOfBuilding: { name: 'PathOfBuildingCommunity', url: 'https://github.com/PathOfBuildingCommunity/PathOfBuilding' },
  PyPoE: { name: 'PyPoE', url: 'https://github.com/OmegaK2/PyPoE' },
  PoeNinja: { name: 'poe.ninja', url: 'https://poe.ninja' },
  BuildCorpus: { name: 'PoB Build Corpus', url: 'embedded' },
  ItemParser: { name: 'Item Text Parser', url: 'embedded' },
  OfficialTrade: { name: 'Official Trade API', url: 'https://www.pathofexile.com/api/trade' },
} as const;

type SourceKey = keyof typeof SOURCE_CATALOG;

function makeProvenance(...keys: SourceKey[]) {
  return {
    poe_version: 'PoE1' as const,
    sources: keys.map((key) => ({
      ...SOURCE_CATALOG[key],
      poe_version: 'PoE1' as const,
    })),
  };
}

function withProvenance<T>(row: T, ...keys: SourceKey[]): T & { provenance: ReturnType<typeof makeProvenance> } {
  return {
    ...row,
    provenance: makeProvenance(...keys),
  };
}

export function normalizeData(repoe: RePoEData, builds: BuildCorpusData, economy: EconomyDataset): NormalizedResult {
  const baseItems = repoe.bases.map((base) =>
    baseItemSchema.parse(
      withProvenance(
        {
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
        },
        'RePoE',
      ),
    )
  );

  const uniqueItems = repoe.uniques.map((unique) =>
    uniqueItemSchema.parse(
      withProvenance(
        {
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
        },
        'RePoE',
      ),
    )
  );

  const mods = repoe.mods.map((mod) =>
    modSchema.parse(
      withProvenance(
        {
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
        },
        'RePoE',
      ),
    )
  );

  const modGroups = repoe.modGroups.map((group) =>
    modGroupSchema.parse(
      withProvenance(
        {
          ...group,
          history: baseHistory,
        },
        'RePoE',
      ),
    )
  );

  const gems = repoe.gems.map((gem) =>
    gemSchema.parse(
      withProvenance(
        {
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
        },
        'RePoE',
      ),
    )
  );

  const passives = repoe.passives.map((node) =>
    passiveNodeSchema.parse(withProvenance({ ...node, history: baseHistory }, 'RePoE'))
  );

  const ascendancies = repoe.ascendancies.map((asc) =>
    ascendancySchema.parse(withProvenance({ ...asc, history: baseHistory }, 'RePoE'))
  );

  const masteries = repoe.masteries.map((mastery) =>
    masterySchema.parse(withProvenance({ ...mastery, history: baseHistory }, 'RePoE'))
  );

  const pobBuilds = builds.builds.map((build) =>
    pobBuildSchema.parse(
      withProvenance(
        {
          ...build,
          generatedAt: build.createdAt,
        },
        'BuildCorpus',
      ),
    )
  );

  const buildSnapshots = builds.snapshots.map((snapshot) =>
    buildSnapshotSchema.parse(withProvenance(snapshot, 'BuildCorpus'))
  );

  const ninjaPoints = economy.snapshots.flatMap((snapshot) =>
    snapshot.lines.map((line) =>
      ninjaPricePointSchema.parse(
        withProvenance(
          {
            id: `${snapshot.league}-${snapshot.kind}-${line.id}`,
            kind: snapshot.kind,
            itemId: line.id,
            chaosValue: line.chaosValue,
            divineValue: line.divineValue ?? null,
            sampleSize: line.sparkline?.data.length ?? null,
            generatedAt: snapshot.generatedAt,
            league: snapshot.league,
          },
          'PoeNinja',
        ),
      ),
    )
  );

  const craftActions = mods.map((mod, index) =>
    craftActionSchema.parse(
      withProvenance(
        {
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
        },
        'RePoE',
        'PoeNinja',
      ),
    )
  );

  const removeAddPaths = baseItems.map((item, index) =>
    removeAddPathSchema.parse(
      withProvenance(
        {
          id: `remove-add-${index}`,
          strategy: 'meta-craft',
          description: `Apply targeted meta-craft on ${item.name}`,
          preconditions: ['open suffix'],
          sequence: ['craft suffix cannot be changed', 'use scouring orb', 'remove meta'],
        },
        'RePoE',
      ),
    )
  );

  const probabilityHints = mods.map((mod, index) =>
    probabilityHintSchema.parse(
      withProvenance(
        {
          id: `prob-${index}`,
          tag: mod.tags[0] ?? 'generic',
          band: 'medium',
          rationale: 'Derived from spawn weights and mod pool size.',
        },
        'RePoE',
      ),
    )
  );

  const tradeListings: Array<typeof tradeListingSchema._type> = [];
  const itemParsed: Array<typeof itemParsedSchema._type> = [];

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
    TradeListing: tradeListings,
    NinjaPricePoint: ninjaPoints,
    CurrencyDigest: economy.snapshots.map((snapshot) =>
      currencyDigestSchema.parse(
        withProvenance(
          {
            id: `digest-${snapshot.league}-${snapshot.kind}`,
            league: snapshot.league,
            generatedAt: snapshot.generatedAt,
            lines: snapshot.lines.map((line) => ({
              currencyId: line.id,
              chaosEquivalent: line.chaosValue,
              volume: line.sparkline?.data.length ?? null,
            })),
          },
          'PoeNinja',
        ),
      ),
    ),
    PoBBuild: pobBuilds,
    BuildSnapshot: buildSnapshots,
    ItemParsed: itemParsed,
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

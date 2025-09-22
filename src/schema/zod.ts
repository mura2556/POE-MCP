import { z } from 'zod';

export const historyEntrySchema = z.object({
  from: z.string(),
  to: z.string().nullable(),
  league: z.string().optional(),
  notes: z.string().optional(),
});

export const statRangeSchema = z.object({
  min: z.number().nullable(),
  max: z.number().nullable(),
  value: z.number().nullable().optional(),
  type: z.string().optional(),
});

export const weightSchema = z.object({
  tag: z.string(),
  weight: z.number(),
});

const generationContextSchema = z.object({
  tags: z.array(z.string()),
  domain: z.string(),
  generationType: z.string(),
  spawnWeights: z.array(weightSchema),
  statRanges: z.array(statRangeSchema),
  conditions: z.array(z.string()).optional(),
  rollTiers: z.array(z.object({
    tier: z.number(),
    stats: z.array(statRangeSchema),
  })).optional(),
  sources: z.array(z.string()).optional(),
});

const baseEntitySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string().optional(),
  icon: z.string().nullable().optional(),
  tags: z.array(z.string()),
  domains: z.array(z.string()).default([]),
  generationType: z.string().optional(),
  spawnWeights: z.array(weightSchema).default([]),
  statRanges: z.array(statRangeSchema).default([]),
  conditions: z.array(z.string()).default([]),
  rollTiers: z.array(z.object({
    tier: z.number(),
    stats: z.array(statRangeSchema),
  })).default([]),
  sources: z.array(z.string()).default([]),
  history: z.array(historyEntrySchema).default([]),
  updatedAt: z.string().optional(),
});

export const baseItemSchema = baseEntitySchema.extend({
  itemClass: z.string(),
  levelRequirement: z.number().int(),
  implicits: z.array(z.string()),
});

export const uniqueItemSchema = baseItemSchema.extend({
  flavourText: z.array(z.string()).optional(),
  dropLevel: z.number().int().optional(),
  prophecyChain: z.array(z.string()).optional(),
});

export const modSchema = baseEntitySchema.extend({
  group: z.string(),
  stats: z.array(z.object({
    id: z.string(),
    min: z.number().nullable(),
    max: z.number().nullable(),
  })),
  generationContext: generationContextSchema,
});

export const modGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  domain: z.string(),
  tags: z.array(z.string()),
  history: z.array(historyEntrySchema).default([]),
});

export const gemSchema = baseEntitySchema.extend({
  gemType: z.enum(['active', 'support']),
  alternateQualities: z.array(z.object({
    name: z.string(),
    statRanges: z.array(statRangeSchema),
  })),
});

export const passiveNodeSchema = baseEntitySchema.extend({
  nodeType: z.string(),
  isAscendancyStart: z.boolean().optional(),
  ascendancyName: z.string().nullable().optional(),
  masteryEffects: z.array(z.string()).optional(),
});

export const ascendancySchema = baseEntitySchema.extend({
  classId: z.number(),
  className: z.string(),
  flavourText: z.array(z.string()).optional(),
});

export const masterySchema = baseEntitySchema.extend({
  effect: z.string(),
  allocations: z.array(z.string()),
});

export const benchCraftSchema = baseEntitySchema.extend({
  cost: z.array(z.object({
    currencyId: z.string(),
    amount: z.number(),
  })),
  unlockHint: z.string().optional(),
  requiredMasterLevel: z.number().optional(),
});

export const essenceSchema = baseEntitySchema.extend({
  tier: z.string(),
  corruptionOutcome: z.string().optional(),
});

export const fossilSchema = baseEntitySchema.extend({
  effect: z.string(),
  exclusions: z.array(z.string()).optional(),
});

export const eldritchImplicitSchema = baseEntitySchema.extend({
  dominance: z.enum(['searing', 'eater']),
  tier: z.number(),
});

export const veiledModSchema = modSchema.extend({
  unveilOptions: z.array(z.string()),
});

export const beastcraftSchema = baseEntitySchema.extend({
  beastIds: z.array(z.string()),
  outcome: z.string(),
});

export const harvestModSchema = baseEntitySchema.extend({
  action: z.string(),
});

export const labEnchantSchema = baseEntitySchema.extend({
  slot: z.string(),
});

export const heistEnchantSchema = baseEntitySchema.extend({
  blueprintType: z.string(),
});

export const corruptionOutcomeSchema = baseEntitySchema.extend({
  outcome: z.string(),
});

export const recombinatorRuleSchema = baseEntitySchema.extend({
  description: z.string(),
});

export const tradeListingSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  price: z.object({
    type: z.string(),
    amount: z.number(),
    currency: z.string(),
  }),
  seller: z.object({
    account: z.string(),
    lastCharacterName: z.string().optional(),
  }),
  listedAt: z.string(),
  league: z.string(),
  history: z.array(historyEntrySchema).default([]),
});

export const ninjaPricePointSchema = z.object({
  id: z.string(),
  kind: z.string(),
  itemId: z.string(),
  chaosValue: z.number(),
  divineValue: z.number().nullable(),
  sampleSize: z.number().nullable(),
  generatedAt: z.string(),
  league: z.string(),
});

export const currencyDigestSchema = z.object({
  id: z.string(),
  league: z.string(),
  generatedAt: z.string(),
  lines: z.array(z.object({
    currencyId: z.string(),
    chaosEquivalent: z.number(),
    volume: z.number().nullable(),
  })),
});

export const pobBuildSchema = z.object({
  id: z.string(),
  title: z.string(),
  author: z.string().optional(),
  pobCode: z.string(),
  createdAt: z.string(),
  tags: z.array(z.string()),
  league: z.string().optional(),
  notes: z.string().optional(),
});

export const buildSnapshotSchema = z.object({
  id: z.string(),
  buildId: z.string(),
  pobCode: z.string(),
  generatedAt: z.string(),
  version: z.string(),
  hash: z.string(),
});

export const itemParsedSchema = z.object({
  id: z.string(),
  baseItemId: z.string(),
  rarity: z.string(),
  identified: z.boolean(),
  corrupted: z.boolean().optional(),
  influences: z.array(z.string()).default([]),
  modifiers: z.array(z.string()).default([]),
  extra: z.record(z.unknown()).optional(),
});

export const craftActionSchema = z.object({
  id: z.string(),
  type: z.enum(['bench', 'essence', 'fossil', 'harvest', 'beast', 'eldritch', 'veiled', 'meta']).or(z.string()),
  inputs: z.array(z.object({
    itemId: z.string(),
    amount: z.number(),
  })),
  eligibleBaseIds: z.array(z.string()),
  constraints: z.array(z.string()),
  blockingRules: z.array(z.string()),
  typicalCostChaos: z.object({
    min: z.number(),
    max: z.number(),
  }),
  linkedPricePointIds: z.array(z.string()),
});

export const removeAddPathSchema = z.object({
  id: z.string(),
  strategy: z.string(),
  description: z.string(),
  preconditions: z.array(z.string()),
  sequence: z.array(z.string()),
});

export const probabilityHintSchema = z.object({
  id: z.string(),
  tag: z.string(),
  band: z.enum(['very_low', 'low', 'medium', 'high', 'very_high']),
  rationale: z.string(),
});

export const schemaMap = {
  BaseItem: baseItemSchema,
  UniqueItem: uniqueItemSchema,
  Mod: modSchema,
  ModGroup: modGroupSchema,
  Gem: gemSchema,
  PassiveNode: passiveNodeSchema,
  Ascendancy: ascendancySchema,
  Mastery: masterySchema,
  BenchCraft: benchCraftSchema,
  Essence: essenceSchema,
  Fossil: fossilSchema,
  EldritchImplicit: eldritchImplicitSchema,
  VeiledMod: veiledModSchema,
  Beastcraft: beastcraftSchema,
  HarvestMod: harvestModSchema,
  LabEnchant: labEnchantSchema,
  HeistEnchant: heistEnchantSchema,
  CorruptionOutcome: corruptionOutcomeSchema,
  RecombinatorRule: recombinatorRuleSchema,
  TradeListing: tradeListingSchema,
  NinjaPricePoint: ninjaPricePointSchema,
  CurrencyDigest: currencyDigestSchema,
  PoBBuild: pobBuildSchema,
  BuildSnapshot: buildSnapshotSchema,
  ItemParsed: itemParsedSchema,
  CraftAction: craftActionSchema,
  RemoveAddPath: removeAddPathSchema,
  ProbabilityHint: probabilityHintSchema,
};

export type SchemaKinds = keyof typeof schemaMap;

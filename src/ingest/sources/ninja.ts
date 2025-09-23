import { normalizeCategory, normalizeItemName, roundChaosValue } from "../../data/normalize.js";
import type { ItemPrice, PriceTable, SnapshotPriceTables } from "../../data/types.js";

const DIVINE_RATE = 190;

interface NinjaItemInput {
  itemId: string;
  name: string;
  category: string;
  chaosValue: number;
  confidence: number;
  sampleSize: number;
  listings: number;
  sources: string[];
}

const baseItems: NinjaItemInput[] = [
  {
    itemId: "currency-chaos-orb",
    name: "Chaos Orb",
    category: "Currency",
    chaosValue: 1,
    confidence: 0.98,
    sampleSize: 1200,
    listings: 900,
    sources: ["poe.ninja"]
  },
  {
    itemId: "currency-divine-orb",
    name: "Divine Orb",
    category: "Currency",
    chaosValue: 190,
    confidence: 0.96,
    sampleSize: 1100,
    listings: 750,
    sources: ["poe.ninja"]
  },
  {
    itemId: "currency-exalted-orb",
    name: "Exalted Orb",
    category: "Currency",
    chaosValue: 95,
    confidence: 0.92,
    sampleSize: 980,
    listings: 650,
    sources: ["poe.ninja"]
  },
  {
    itemId: "fragment-maven-writ",
    name: "The Maven's Writ",
    category: "Fragment",
    chaosValue: 125,
    confidence: 0.88,
    sampleSize: 450,
    listings: 260,
    sources: ["poe.ninja"]
  },
  {
    itemId: "lifeforce-vivid",
    name: "Vivid Lifeforce",
    category: "Craft",
    chaosValue: 2.6,
    confidence: 0.83,
    sampleSize: 320,
    listings: 180,
    sources: ["poe.ninja", "bulk" ]
  },
  {
    itemId: "fossil-aetheric",
    name: "Aetheric Fossil",
    category: "Fossil",
    chaosValue: 15,
    confidence: 0.81,
    sampleSize: 280,
    listings: 200,
    sources: ["poe.ninja"]
  }
];

const toItemPrice = (input: NinjaItemInput): ItemPrice => {
  const normalizedName = normalizeItemName(input.name);
  return {
    itemId: input.itemId,
    name: input.name,
    normalizedName,
    category: normalizeCategory(input.category),
    chaosValue: roundChaosValue(input.chaosValue),
    divineValue: roundChaosValue(input.chaosValue / DIVINE_RATE),
    confidence: input.confidence,
    sampleSize: input.sampleSize,
    listings: input.listings,
    sources: input.sources,
    lastUpdated: new Date().toISOString()
  };
};

const buildPriceTables = (items: ItemPrice[]): Record<string, PriceTable> => {
  const now = new Date().toISOString();
  return {
    currency: {
      id: "currency",
      title: "Currency Overview",
      category: "currency",
      description: "Exchange rates for core league currency items.",
      entries: items
        .filter((item) => item.category === "currency")
        .map((item) => item.itemId),
      lastUpdated: now
    },
    fragment: {
      id: "fragment",
      title: "Fragments",
      category: "fragment",
      description: "Boss fragments and invitations.",
      entries: items
        .filter((item) => item.category === "fragment")
        .map((item) => item.itemId),
      lastUpdated: now
    },
    crafting: {
      id: "crafting",
      title: "Crafting Components",
      category: "craft",
      description: "Bulk crafting resources and fossils.",
      entries: items
        .filter((item) => item.category === "craft" || item.category === "fossil")
        .map((item) => item.itemId),
      lastUpdated: now
    }
  };
};

export interface NinjaPriceResult {
  league: string;
  prices: SnapshotPriceTables;
}

export const loadNinjaPrices = async (): Promise<NinjaPriceResult> => {
  const items = baseItems.map(toItemPrice);
  const record: Record<string, ItemPrice> = {};
  for (const item of items) {
    record[item.itemId] = item;
  }

  const tables = buildPriceTables(items);

  const prices: SnapshotPriceTables = {
    items: record,
    tables,
    divineChaosRate: DIVINE_RATE
  };

  return {
    league: "Ancestor",
    prices
  };
};

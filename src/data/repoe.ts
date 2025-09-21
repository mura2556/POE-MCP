import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";

import { normalizeCategory, normalizeItemName, roundChaosValue } from "./normalize.js";
import type { ItemPrice } from "./types.js";

const RePoEItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  chaosValue: z.number().nonnegative(),
  tags: z.array(z.string()).default([])
});

export type RePoEItem = z.infer<typeof RePoEItemSchema>;

export interface LoadRePoEOptions {
  filePath?: string;
}

const defaultItems: RePoEItem[] = [
  {
    id: "currency-chaos-orb",
    name: "Chaos Orb",
    category: "Currency",
    chaosValue: 1,
    tags: ["currency", "chaos"]
  },
  {
    id: "currency-divine-orb",
    name: "Divine Orb",
    category: "Currency",
    chaosValue: 180,
    tags: ["currency", "divine"]
  },
  {
    id: "currency-exalted-orb",
    name: "Exalted Orb",
    category: "Currency",
    chaosValue: 90,
    tags: ["currency", "exalt"]
  },
  {
    id: "fragment-maven-writ",
    name: "The Maven's Writ",
    category: "Fragment",
    chaosValue: 115,
    tags: ["fragment", "maven"]
  }
];

export const loadRePoEItems = async (
  options: LoadRePoEOptions = {}
): Promise<RePoEItem[]> => {
  if (!options.filePath) {
    return defaultItems;
  }

  const resolved = path.isAbsolute(options.filePath)
    ? options.filePath
    : path.resolve(process.cwd(), options.filePath);

  const raw = await fs.readFile(resolved, "utf-8");
  const parsed = JSON.parse(raw) as unknown;
  const array = z.array(RePoEItemSchema);
  return array.parse(parsed);
};

export const toItemPrice = (item: RePoEItem): ItemPrice => {
  const normalizedName = normalizeItemName(item.name);
  return {
    itemId: item.id,
    name: item.name,
    normalizedName,
    category: normalizeCategory(item.category),
    chaosValue: roundChaosValue(item.chaosValue),
    divineValue: roundChaosValue(item.chaosValue / 180),
    confidence: 0.75,
    sampleSize: 50,
    listings: 25,
    sources: ["RePoE"]
  };
};

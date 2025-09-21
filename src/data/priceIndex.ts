import { chaosToDivine, normalizeItemName, scoreSearchMatch } from "./normalize.js";
import type { ItemPrice, Snapshot } from "./types.js";

export class PriceIndex {
  private readonly itemsByNormalizedName: Map<string, ItemPrice> = new Map();
  private readonly itemsById: Map<string, ItemPrice> = new Map();

  constructor(private readonly snapshot: Snapshot) {
    for (const item of snapshot.items) {
      this.itemsByNormalizedName.set(item.normalizedName, item);
      this.itemsById.set(item.itemId, item);
    }
  }

  get snapshotMetadata(): Snapshot["metadata"] {
    return this.snapshot.metadata;
  }

  get createdAt(): string {
    return this.snapshot.createdAt;
  }

  get version(): string {
    return this.snapshot.version;
  }

  list(): ItemPrice[] {
    return [...this.snapshot.items];
  }

  getById(itemId: string): ItemPrice | undefined {
    return this.itemsById.get(itemId);
  }

  getByName(name: string): ItemPrice | undefined {
    const normalized = normalizeItemName(name);
    return this.itemsByNormalizedName.get(normalized);
  }

  getSuggestedDivineRate(): number {
    const chaos = this.getByName("chaos orb");
    const divine = this.getByName("divine orb");
    if (!chaos || !divine || divine.chaosValue === 0) {
      return 180;
    }

    return chaos.chaosValue / divine.chaosValue;
  }

  search(query: string, limit = 10): ItemPrice[] {
    const normalizedQuery = normalizeItemName(query);
    const scored = this.list()
      .map((item) => ({
        item,
        score: scoreSearchMatch(normalizedQuery, item.normalizedName)
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
      .slice(0, limit)
      .map((entry) => entry.item);

    if (scored.length > 0) {
      return scored;
    }

    // Fallback to simple substring search if scoring produced no matches.
    const fallback = this.list().filter((item) =>
      item.normalizedName.includes(normalizedQuery)
    );
    return fallback.slice(0, limit);
  }

  toStructuredResult(item: ItemPrice) {
    return {
      itemId: item.itemId,
      name: item.name,
      normalizedName: item.normalizedName,
      category: item.category,
      chaosValue: item.chaosValue,
      divineValue: chaosToDivine(item.chaosValue),
      confidence: item.confidence,
      sampleSize: item.sampleSize,
      listings: item.listings,
      sources: item.sources
    };
  }
}

export const createPriceIndex = (snapshot: Snapshot): PriceIndex =>
  new PriceIndex(snapshot);

import { z } from "zod";

import { normalizeItemName } from "../../data/normalize.js";
import type { ItemPrice } from "../../data/types.js";
import type { ToolRegistrationContext } from "./types.js";

const outputSchema = {
  snapshot: z.object({
    createdAt: z.string(),
    version: z.string()
  }),
  items: z.array(
    z.object({
      itemId: z.string(),
      name: z.string(),
      normalizedName: z.string(),
      category: z.string(),
      chaosValue: z.number(),
      divineValue: z.number(),
      confidence: z.number(),
      sampleSize: z.number(),
      listings: z.number(),
      sources: z.array(z.string())
    })
  )
};

const toStructured = (items: ItemPrice[], snapshot: { createdAt: string; version: string }) => ({
  snapshot,
  items: items.map((item) => ({
    itemId: item.itemId,
    name: item.name,
    normalizedName: item.normalizedName,
    category: item.category,
    chaosValue: item.chaosValue,
    divineValue: item.divineValue,
    confidence: item.confidence,
    sampleSize: item.sampleSize,
    listings: item.listings,
    sources: item.sources
  }))
});

export const registerPriceLookupTool = (
  context: ToolRegistrationContext
) => {
  context.server.registerTool(
    "price_lookup",
    {
      title: "Item price lookup",
      description: "Lookup price information for an item in the latest snapshot.",
      inputSchema: {
        name: z.string().min(1).describe("Human readable item name"),
        exact: z
          .boolean()
          .optional()
          .describe("If true, only return results that exactly match the normalized name."),
        limit: z
          .number()
          .int()
          .positive()
          .max(20)
          .optional()
          .describe("Maximum number of matches to return when fuzzy searching.")
      },
      outputSchema
    },
    async ({ name, exact = false, limit = 5 }) => {
      const priceIndex = await context.dataContext.getPriceIndex();
      const normalized = normalizeItemName(name);

      let matches: ItemPrice[] = [];
      if (exact) {
        const item = priceIndex.getByName(normalized);
        if (item) {
          matches = [item];
        }
      } else {
        matches = priceIndex.search(normalized, limit);
      }

      if (matches.length === 0) {
        const message = `No price data found for "${name}".`;
        context.logger.warn({ name }, message);
        return {
          content: [
            {
              type: "text" as const,
              text: message
            }
          ],
          isError: true
        };
      }

      const structured = toStructured(matches, {
        createdAt: priceIndex.createdAt,
        version: priceIndex.version
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(structured, null, 2)
          }
        ],
        structuredContent: structured
      };
    }
  );
};

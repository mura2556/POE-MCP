import { z } from "zod";

import type { ToolRegistrationContext } from "./types.js";

export const registerSearchPricesTool = (
  context: ToolRegistrationContext
) => {
  interface SearchPricesArgs {
    query: string;
    limit?: number;
  }

  context.server.registerTool(
    "search_prices",
    {
      title: "Search items by name",
      description:
        "Perform a fuzzy search against the price index and return the top matches.",
      inputSchema: {
        query: z.string().min(2).describe("Free text search query"),
        limit: z
          .number()
          .int()
          .positive()
          .max(25)
          .optional()
          .describe("Maximum number of results to return")
      },
      outputSchema: {
        results: z.array(
          z.object({
            itemId: z.string(),
            name: z.string(),
            normalizedName: z.string(),
            chaosValue: z.number(),
            confidence: z.number()
          })
        )
      }
    },
    async ({ query, limit = 10 }: SearchPricesArgs) => {
      const priceIndex = await context.dataContext.getPriceIndex();
      const matches = priceIndex.search(query, limit).map((item) => ({
        itemId: item.itemId,
        name: item.name,
        normalizedName: item.normalizedName,
        chaosValue: item.chaosValue,
        confidence: item.confidence
      }));

      if (matches.length === 0) {
        const message = `No matches found for query "${query}".`;
        return {
          content: [
            {
              type: "text" as const,
              text: message
            }
          ],
          structuredContent: { results: [] }
        };
      }

      const structured = { results: matches };
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

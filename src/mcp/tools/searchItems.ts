import { z } from "zod";

import {
  createToolOutputSchema,
  wrapToolHandler,
  type ToolHandlerResult
} from "./helpers.js";
import type { ToolRegistrationContext } from "./types.js";

const InputSchema = z.object({
  query: z.string().min(1, "Provide an item name or keyword."),
  limit: z
    .number()
    .int()
    .positive()
    .max(25)
    .optional()
    .describe("Maximum number of price entries to return.")
});

const ItemSchema = z.object({
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
});

const OutputSchema = createToolOutputSchema({
  items: z.array(ItemSchema),
  total: z.number()
});

const formatResult = (
  items: z.infer<typeof ItemSchema>[]
): ToolHandlerResult<{ items: z.infer<typeof ItemSchema>[]; total: number }> => ({
  data: {
    items,
    total: items.length
  },
  text: `Found ${items.length} price${items.length === 1 ? "" : "s"}.`
});

export const registerSearchItemsTool = (context: ToolRegistrationContext) => {
  context.server.registerTool(
    "search_items",
    {
      title: "Search priced items",
      description: "Fuzzy search the snapshot price index for matching items.",
      inputSchema: InputSchema.shape,
      outputSchema: OutputSchema.shape,
      annotations: {
        usageHints: [
          'search_items {"query":"orb"}',
          'search_items {"query":"maven","limit":2}'
        ]
      }
    },
    wrapToolHandler(context, InputSchema, async ({ query, limit = 10 }) => {
      const items = await context.dataContext.searchItems(query, limit);
      return formatResult(items);
    })
  );
};

export { InputSchema as SearchItemsInputSchema, OutputSchema as SearchItemsOutputSchema };

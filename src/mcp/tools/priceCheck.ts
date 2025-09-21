import { z } from "zod";

import {
  createToolOutputSchema,
  wrapToolHandler,
  type ToolHandlerResult
} from "./helpers.js";
import type { ToolRegistrationContext } from "./types.js";

const InputSchema = z.object({
  name: z.string().min(1, "Provide an item name to check."),
  quantity: z
    .number()
    .int()
    .positive()
    .max(100)
    .optional()
    .describe("Number of items for total cost calculation."),
  exact: z
    .boolean()
    .optional()
    .describe("Require an exact match on the normalized item name.")
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
  item: ItemSchema,
  quantity: z.number(),
  totalChaos: z.number(),
  totalDivine: z.number()
});

type PriceCheckResult = z.infer<typeof OutputSchema>["item"];

const formatResult = (
  result: { item: PriceCheckResult; quantity: number; totalChaos: number; totalDivine: number }
): ToolHandlerResult<{
  item: PriceCheckResult;
  quantity: number;
  totalChaos: number;
  totalDivine: number;
}> => ({
  data: result,
  text: `Estimated cost: ${result.totalChaos} chaos (${result.totalDivine} divine).`
});

export const registerPriceCheckTool = (context: ToolRegistrationContext) => {
  context.server.registerTool(
    "price_check",
    {
      title: "Price check an item",
      description: "Look up an item's price in the latest snapshot and compute totals for a quantity.",
      inputSchema: InputSchema.shape,
      outputSchema: OutputSchema.shape,
      annotations: {
        usageHints: [
          'price_check {"name":"Divine Orb"}',
          'price_check {"name":"Chaos Orb","quantity":10}'
        ]
      }
    },
    wrapToolHandler(context, InputSchema, async ({ name, quantity = 1, exact = false }) => {
      const result = await context.dataContext.priceCheck(name, quantity, exact);
      return formatResult(result);
    })
  );
};

export { InputSchema as PriceCheckInputSchema, OutputSchema as PriceCheckOutputSchema };

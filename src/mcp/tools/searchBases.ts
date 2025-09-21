import { z } from "zod";

import type { BaseItemDefinition } from "../../data/index.js";
import {
  createToolOutputSchema,
  wrapToolHandler,
  type ToolHandlerResult
} from "./helpers.js";
import type { ToolRegistrationContext } from "./types.js";

const InputSchema = z.object({
  query: z.string().min(1, "Provide a base item name or keyword."),
  limit: z
    .number()
    .int()
    .positive()
    .max(25)
    .optional()
    .describe("Maximum number of bases to return."),
  tag: z.string().optional().describe("Filter by base tags (armour, weapon, etc.)")
});

const BaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  itemClass: z.string(),
  requiredLevel: z.number(),
  tags: z.array(z.string()),
  implicitMods: z.array(z.string())
});

const OutputSchema = createToolOutputSchema({
  bases: z.array(BaseSchema),
  total: z.number()
});

const formatResult = (bases: BaseItemDefinition[]): ToolHandlerResult<{ bases: BaseItemDefinition[]; total: number }> => ({
  data: {
    bases,
    total: bases.length
  },
  text: `Found ${bases.length} base${bases.length === 1 ? "" : "s"}.`
});

export const registerSearchBasesTool = (context: ToolRegistrationContext) => {
  context.server.registerTool(
    "search_bases",
    {
      title: "Search item bases",
      description: "Find base items that match a query or tag.",
      inputSchema: InputSchema.shape,
      outputSchema: OutputSchema.shape,
      annotations: {
        usageHints: [
          'search_bases {"query":"chainmail"}',
          'search_bases {"query":"ring","tag":"jewellery"}'
        ]
      }
    },
    wrapToolHandler(context, InputSchema, async ({ query, limit = 5, tag }) => {
      const bases = context.dataContext.searchBases(query, { limit, tag });
      return formatResult(bases);
    })
  );
};

export { InputSchema as SearchBasesInputSchema, OutputSchema as SearchBasesOutputSchema };

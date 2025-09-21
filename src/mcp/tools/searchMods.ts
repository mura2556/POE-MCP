import { z } from "zod";

import type { ModDefinition } from "../../data/index.js";
import {
  createToolOutputSchema,
  wrapToolHandler,
  type ToolHandlerResult
} from "./helpers.js";
import type { ToolRegistrationContext } from "./types.js";

const InputSchema = z.object({
  query: z.string().min(1, "Provide a modifier name or keyword."),
  limit: z
    .number()
    .int()
    .positive()
    .max(25)
    .optional()
    .describe("Maximum number of modifiers to return."),
  tag: z.string().optional().describe("Filter modifiers by tag")
});

const ModSchema = z.object({
  id: z.string(),
  name: z.string(),
  tier: z.string(),
  generationType: z.enum(["prefix", "suffix", "implicit"]),
  description: z.string(),
  tags: z.array(z.string()),
  applicableTags: z.array(z.string()),
  minimumItemLevel: z.number()
});

const OutputSchema = createToolOutputSchema({
  mods: z.array(ModSchema),
  total: z.number()
});

const formatResult = (mods: ModDefinition[]): ToolHandlerResult<{ mods: ModDefinition[]; total: number }> => ({
  data: {
    mods,
    total: mods.length
  },
  text: `Found ${mods.length} modifier${mods.length === 1 ? "" : "s"}.`
});

export const registerSearchModsTool = (context: ToolRegistrationContext) => {
  context.server.registerTool(
    "search_mods",
    {
      title: "Search crafting modifiers",
      description: "Discover crafting modifiers using fuzzy search and optional tag filters.",
      inputSchema: InputSchema.shape,
      outputSchema: OutputSchema.shape,
      annotations: {
        usageHints: [
          'search_mods {"query":"life"}',
          'search_mods {"query":"resistance","limit":3}'
        ]
      }
    },
    wrapToolHandler(context, InputSchema, async ({ query, limit = 5, tag }) => {
      const mods = context.dataContext.searchMods(query, { limit, tag });
      return formatResult(mods);
    })
  );
};

export { OutputSchema as SearchModsOutputSchema, InputSchema as SearchModsInputSchema };

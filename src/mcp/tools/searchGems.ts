import { z } from "zod";

import type { GemDefinition } from "../../data/index.js";
import {
  createToolOutputSchema,
  wrapToolHandler,
  type ToolHandlerResult
} from "./helpers.js";
import type { ToolRegistrationContext } from "./types.js";

const InputSchema = z.object({
  query: z.string().min(1, "Provide a gem name or keyword."),
  limit: z
    .number()
    .int()
    .positive()
    .max(25)
    .optional()
    .describe("Maximum number of gem matches."),
  primaryAttribute: z
    .enum(["Strength", "Dexterity", "Intelligence", "Universal"])
    .optional()
    .describe("Filter gems by primary attribute."),
  tag: z.string().optional().describe("Filter results by gem tag")
});

const GemSchema = z.object({
  id: z.string(),
  name: z.string(),
  primaryAttribute: z.enum(["Strength", "Dexterity", "Intelligence", "Universal"]),
  tags: z.array(z.string()),
  description: z.string()
});

const OutputSchema = createToolOutputSchema({
  gems: z.array(GemSchema),
  total: z.number()
});

const formatResult = (gems: GemDefinition[]): ToolHandlerResult<{ gems: GemDefinition[]; total: number }> => ({
  data: {
    gems,
    total: gems.length
  },
  text: `Found ${gems.length} gem${gems.length === 1 ? "" : "s"}.`
});

export const registerSearchGemsTool = (context: ToolRegistrationContext) => {
  context.server.registerTool(
    "search_gems",
    {
      title: "Search skill gems",
      description: "Explore skill gems filtered by attribute or keyword.",
      inputSchema: InputSchema.shape,
      outputSchema: OutputSchema.shape,
      annotations: {
        usageHints: [
          'search_gems {"query":"fire"}',
          'search_gems {"query":"aura","primaryAttribute":"Strength"}'
        ]
      }
    },
    wrapToolHandler(context, InputSchema, async ({ query, limit = 5, primaryAttribute, tag }) => {
      const gems = context.dataContext.searchGems(query, { limit, primaryAttribute, tag });
      return formatResult(gems);
    })
  );
};

export { InputSchema as SearchGemsInputSchema, OutputSchema as SearchGemsOutputSchema };

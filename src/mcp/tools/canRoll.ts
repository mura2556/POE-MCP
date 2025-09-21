import { z } from "zod";

import type { BaseItemDefinition, ModDefinition } from "../../data/index.js";
import {
  createToolOutputSchema,
  wrapToolHandler,
  type ToolHandlerResult
} from "./helpers.js";
import type { ToolRegistrationContext } from "./types.js";

const InputSchema = z.object({
  base: z.string().min(1, "Provide a base item name or identifier."),
  mod: z.string().min(1, "Provide a modifier name or identifier.")
});

const BaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  itemClass: z.string(),
  requiredLevel: z.number(),
  tags: z.array(z.string()),
  implicitMods: z.array(z.string())
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
  canRoll: z.boolean(),
  reasons: z.array(z.string()),
  base: BaseSchema,
  mod: ModSchema
});

const formatResult = (
  base: BaseItemDefinition,
  mod: ModDefinition,
  canRoll: boolean,
  reasons: string[]
): ToolHandlerResult<{ canRoll: boolean; reasons: string[]; base: BaseItemDefinition; mod: ModDefinition }> => ({
  data: { base, mod, canRoll, reasons },
  text: canRoll
    ? `${mod.name} can roll on ${base.name}.`
    : `${mod.name} cannot roll on ${base.name}.`
});

export const registerCanRollTool = (context: ToolRegistrationContext) => {
  context.server.registerTool(
    "can_roll",
    {
      title: "Check if a modifier can roll on a base",
      description: "Evaluates tag and level requirements for crafting modifiers.",
      inputSchema: InputSchema.shape,
      outputSchema: OutputSchema.shape,
      annotations: {
        usageHints: [
          'can_roll {"base":"Saintly Chainmail","mod":"T1 Increased Maximum Life"}'
        ]
      }
    },
    wrapToolHandler(context, InputSchema, async ({ base, mod }) => {
      const result = context.dataContext.canRollMod(base, mod);
      return formatResult(result.base, result.mod, result.canRoll, result.reasons);
    })
  );
};

export { InputSchema as CanRollInputSchema, OutputSchema as CanRollOutputSchema };

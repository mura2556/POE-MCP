import { z } from "zod";

import type { CraftPlan } from "../../data/index.js";
import {
  createToolOutputSchema,
  wrapToolHandler,
  type ToolHandlerResult
} from "./helpers.js";
import type { ToolRegistrationContext } from "./types.js";

const InputSchema = z.object({
  base: z.string().min(1, "Provide a base item name."),
  mods: z.array(z.string().min(1)).min(1, "Specify at least one target modifier."),
  notes: z.string().optional().describe("Optional notes to include with the plan.")
});

const CostSchema = z.object({
  currency: z.string(),
  amount: z.number()
});

const StepSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  requires: z.array(z.string()).optional(),
  cost: z.array(CostSchema).optional()
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
  generationType: z.enum(["prefix", "suffix", "implicit", "enchant"]),
  description: z.string(),
  tags: z.array(z.string()),
  applicableTags: z.array(z.string()),
  minimumItemLevel: z.number()
});

const OutputSchema = createToolOutputSchema({
  planId: z.string(),
  base: BaseSchema,
  mods: z.array(ModSchema),
  steps: z.array(StepSchema),
  estimatedCost: z.object({
    chaos: z.number(),
    divine: z.number()
  })
});

type PlanPayload = z.infer<typeof OutputSchema>;

const formatResult = (plan: CraftPlan): ToolHandlerResult<Omit<PlanPayload, "snapshotVersion" | "league">> => ({
  data: {
    planId: plan.id,
    base: plan.base,
    mods: plan.mods,
    steps: plan.steps,
    estimatedCost: plan.estimatedCost
  },
  text: `Created craft plan ${plan.id} with ${plan.steps.length} steps.`
});

export const registerPlanCraftTool = (context: ToolRegistrationContext) => {
  context.server.registerTool(
    "plan_craft",
    {
      title: "Plan a crafting sequence",
      description: "Generate a step-by-step plan for crafting a base with target modifiers.",
      inputSchema: InputSchema.shape,
      outputSchema: OutputSchema.shape,
      annotations: {
        usageHints: [
          'plan_craft {"base":"Saintly Chainmail","mods":["T1 Increased Maximum Life","T2 All Elemental Resistances"]}'
        ]
      }
    },
    wrapToolHandler(context, InputSchema, async ({ base, mods }) => {
      const plan = await context.dataContext.planCraft(base, mods);
      return formatResult(plan);
    })
  );
};

export { InputSchema as PlanCraftInputSchema, OutputSchema as PlanCraftOutputSchema };

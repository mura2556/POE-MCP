import { z } from "zod";

import {
  createToolOutputSchema,
  wrapToolHandler,
  type ToolHandlerResult
} from "./helpers.js";
import type { ToolRegistrationContext } from "./types.js";

const InputSchema = z.object({
  leftId: z.string().min(1, "Provide the baseline build identifier."),
  rightId: z.string().min(1, "Provide the comparison build identifier.")
});

const BuildSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  characterClass: z.string(),
  dps: z.number(),
  itemCount: z.number()
});

const DeltaSchema = z.object({
  dps: z.number(),
  newItems: z.array(z.string()),
  removedItems: z.array(z.string())
});

const PayloadSchema = z.object({
  left: BuildSummarySchema,
  right: BuildSummarySchema,
  delta: DeltaSchema
});

const OutputSchema = createToolOutputSchema(PayloadSchema.shape);

type PobDeltaPayload = z.infer<typeof PayloadSchema>;

const formatResult = (payload: PobDeltaPayload): ToolHandlerResult<PobDeltaPayload> => ({
  data: payload,
  text: `DPS delta: ${payload.delta.dps >= 0 ? "+" : ""}${payload.delta.dps.toFixed(0)}`
});

export const registerPobDeltaTool = (context: ToolRegistrationContext) => {
  context.server.registerTool(
    "pob_delta",
    {
      title: "Compare Path of Building setups",
      description: "Computes DPS and item differences between two imported PoB builds.",
      inputSchema: InputSchema.shape,
      outputSchema: OutputSchema.shape,
      annotations: {
        usageHints: [
          'pob_delta {"leftId":"starter-righteous-fire","rightId":"essence-shotgun"}'
        ]
      }
    },
    wrapToolHandler(context, InputSchema, async ({ leftId, rightId }) => {
      const diff = context.dataContext.diffPobBuilds(leftId, rightId);

      const toSummary = (build: typeof diff.left) => ({
        id: build.id,
        name: build.name,
        characterClass: build.characterClass,
        dps: build.dps,
        itemCount: build.items.length
      });

      const payload: PobDeltaPayload = {
        left: toSummary(diff.left),
        right: toSummary(diff.right),
        delta: {
          dps: diff.delta.dps,
          newItems: diff.delta.newItems,
          removedItems: diff.delta.removedItems
        }
      };

      return formatResult(payload);
    })
  );
};

export { InputSchema as PobDeltaInputSchema, OutputSchema as PobDeltaOutputSchema };

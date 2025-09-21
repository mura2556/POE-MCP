import { z } from "zod";

import {
  createToolOutputSchema,
  wrapToolHandler,
  type ToolHandlerResult
} from "./helpers.js";
import type { ToolRegistrationContext } from "./types.js";

const InputSchema = z.object({
  planId: z.string().min(1, "Provide a plan identifier."),
  stepId: z.string().min(1, "Provide a step identifier."),
  completedSteps: z.array(z.string()).optional()
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

const OutputSchema = createToolOutputSchema({
  planId: z.string(),
  stepId: z.string(),
  isValid: z.boolean(),
  missingDependencies: z.array(z.string()),
  step: StepSchema,
  totalSteps: z.number()
});

type ValidatePayload = z.infer<typeof OutputSchema>;

const formatResult = (
  payload: Omit<ValidatePayload, "snapshotVersion" | "league">
): ToolHandlerResult<Omit<ValidatePayload, "snapshotVersion" | "league">> => ({
  data: payload,
  text: payload.isValid
    ? `Step ${payload.stepId} is ready to execute.`
    : `Step ${payload.stepId} is blocked by ${payload.missingDependencies.join(", ") || "unmet prerequisites"}.`
});

export const registerValidateStepTool = (context: ToolRegistrationContext) => {
  context.server.registerTool(
    "validate_step",
    {
      title: "Validate a crafting plan step",
      description: "Ensures plan dependencies are satisfied before executing a step.",
      inputSchema: InputSchema.shape,
      outputSchema: OutputSchema.shape,
      annotations: {
        usageHints: [
          'validate_step {"planId":"<id>","stepId":"<id>","completedSteps":[]}'
        ]
      }
    },
    wrapToolHandler(context, InputSchema, async ({ planId, stepId, completedSteps = [] }) => {
      const result = context.dataContext.validateCraftStep(planId, stepId, completedSteps);
      return formatResult({
        planId,
        stepId,
        isValid: result.isValid,
        missingDependencies: result.missing,
        step: result.step,
        totalSteps: result.plan.steps.length
      });
    })
  );
};

export { InputSchema as ValidateStepInputSchema, OutputSchema as ValidateStepOutputSchema };

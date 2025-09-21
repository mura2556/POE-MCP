import type { ToolRegistrationContext } from "./types.js";
import { registerCanRollTool } from "./canRoll.js";
import { registerPlanCraftTool } from "./planCraft.js";
import { registerPobDeltaTool } from "./pobDelta.js";
import { registerPobImportTool } from "./pobImport.js";
import { registerPriceCheckTool } from "./priceCheck.js";
import { registerSearchBasesTool } from "./searchBases.js";
import { registerSearchGemsTool } from "./searchGems.js";
import { registerSearchItemsTool } from "./searchItems.js";
import { registerSearchModsTool } from "./searchMods.js";
import { registerValidateStepTool } from "./validateStep.js";

const registrars = [
  registerSearchModsTool,
  registerCanRollTool,
  registerSearchBasesTool,
  registerSearchGemsTool,
  registerPriceCheckTool,
  registerPobImportTool,
  registerPobDeltaTool,
  registerPlanCraftTool,
  registerValidateStepTool,
  registerSearchItemsTool
];

export const registerAllTools = (context: ToolRegistrationContext) => {
  for (const register of registrars) {
    register(context);
  }
};

export * from "./types.js";

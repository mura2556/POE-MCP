import type { ToolRegistrationContext } from "./types.js";
import { registerListSnapshotsTool } from "./listSnapshots.js";
import { registerPriceLookupTool } from "./priceLookup.js";
import { registerRefreshSnapshotTool } from "./refreshSnapshot.js";
import { registerSearchPricesTool } from "./searchPrices.js";

export const registerAllTools = (context: ToolRegistrationContext) => {
  registerPriceLookupTool(context);
  registerSearchPricesTool(context);
  registerListSnapshotsTool(context);
  registerRefreshSnapshotTool(context);
};

export * from "./types.js";

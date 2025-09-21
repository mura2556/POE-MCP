import type { ToolRegistrationContext } from "./types.js";

export const registerRefreshSnapshotTool = (
  context: ToolRegistrationContext
) => {
  context.server.registerTool(
    "refresh_snapshot",
    {
      title: "Reload latest snapshot",
      description: "Reload the latest snapshot from disk and refresh the price index."
    },
    async () => {
      const priceIndex = await context.dataContext.refreshPriceIndex();
      const structured = {
        snapshot: {
          createdAt: priceIndex.createdAt,
          version: priceIndex.version,
          metadata: priceIndex.snapshotMetadata
        }
      };

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(structured, null, 2)
          }
        ],
        structuredContent: structured
      };
    }
  );
};

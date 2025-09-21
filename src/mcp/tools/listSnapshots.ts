import type { ToolRegistrationContext } from "./types.js";

export const registerListSnapshotsTool = (
  context: ToolRegistrationContext
) => {
  context.server.registerTool(
    "list_snapshots",
    {
      title: "List available snapshots",
      description: "Return metadata for every snapshot stored on disk."
    },
    async () => {
      const snapshots = await context.dataContext.listSnapshots();
      const structured = { snapshots };
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

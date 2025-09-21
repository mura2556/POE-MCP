import { z } from "zod";

import { PobBuildSchema } from "../../data/pob.js";
import {
  createToolOutputSchema,
  wrapToolHandler,
  type ToolHandlerResult
} from "./helpers.js";
import type { ToolRegistrationContext } from "./types.js";

const InputSchema = z.object({
  build: z.union([z.string(), PobBuildSchema]),
  id: z.string().min(1).optional().describe("Optional identifier to persist the build under.")
});

const StoredBuildSchema = PobBuildSchema.extend({
  items: z.array(z.string())
});

const OutputSchema = createToolOutputSchema({
  buildId: z.string(),
  name: z.string(),
  characterClass: z.string(),
  dps: z.number(),
  itemCount: z.number(),
  build: StoredBuildSchema
});

type StoredBuild = z.infer<typeof OutputSchema>;

const formatResult = (
  build: z.infer<typeof StoredBuildSchema>
): ToolHandlerResult<Omit<StoredBuild, "snapshotVersion" | "league">> => ({
  data: {
    buildId: build.id,
    name: build.name,
    characterClass: build.characterClass,
    dps: build.dps,
    itemCount: build.items.length,
    build
  },
  text: `Imported build "${build.name}" (${build.id}).`
});

export const registerPobImportTool = (context: ToolRegistrationContext) => {
  context.server.registerTool(
    "pob_import",
    {
      title: "Import a Path of Building setup",
      description: "Parses a PoB build description and stores it for later comparisons.",
      inputSchema: InputSchema.shape,
      outputSchema: OutputSchema.shape,
      annotations: {
        usageHints: [
          'pob_import {"build":{"id":"rf","name":"Righteous Fire","dps":850000}}'
        ]
      }
    },
    wrapToolHandler(context, InputSchema, async ({ build, id }) => {
      const stored = context.dataContext.importPobBuild(build, id);
      return formatResult(stored);
    })
  );
};

export { InputSchema as PobImportInputSchema, OutputSchema as PobImportOutputSchema };

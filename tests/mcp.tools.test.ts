import path from "node:path";

import { describe, expect, it } from "vitest";

import { createDataContext } from "../src/data/index.js";
import { createLogger } from "../src/logging/index.js";
import { registerAllTools } from "../src/mcp/tools/index.js";
import type { ToolRegistrar } from "../src/mcp/tools/types.js";

class FakeServer implements ToolRegistrar {
  public tools = new Map<
    string,
    {
      config: Record<string, unknown>;
      callback: (...args: any[]) => Promise<any> | any;
    }
  >();

  registerTool(name: string, config: Record<string, unknown>, cb: any) {
    this.tools.set(name, { config, callback: cb });
    return undefined;
  }
}

describe("registerAllTools", () => {
  it("registers tools and the price lookup returns structured data", async () => {
    const snapshotDir = path.resolve("src/ingest/out");
    const dataContext = createDataContext({ snapshotDir });
    await dataContext.ensureReady();

    const server = new FakeServer();
    const logger = createLogger({ name: "mcp-tools-test", level: "silent" });

    registerAllTools({
      server,
      dataContext,
      logger
    });

    expect(server.tools.size).toBe(4);

    const priceLookup = server.tools.get("price_lookup");
    expect(priceLookup).toBeDefined();
    const result = await priceLookup!.callback(
      { name: "Divine Orb", exact: true },
      {} as any
    );
    expect(result.structuredContent.items[0].name).toBe("Divine Orb");

    const listSnapshots = server.tools.get("list_snapshots");
    expect(listSnapshots).toBeDefined();
    const listResult = await listSnapshots!.callback({} as any);
    expect(listResult.structuredContent.snapshots.length).toBeGreaterThan(0);
  });
});

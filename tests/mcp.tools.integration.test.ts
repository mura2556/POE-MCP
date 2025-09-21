import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createDataContext } from "../src/data/index.js";
import { createLogger } from "../src/logging/index.js";
import { startMcpServer } from "../src/mcp/index.js";

describe("MCP tool integration", () => {
  const snapshotDir = path.resolve("src/ingest/out");
  const logger = createLogger({ name: "mcp-tools-integration", level: "silent" });
  const dataContext = createDataContext({ snapshotDir, logger });

  let server: Awaited<ReturnType<typeof startMcpServer>>["server"];
  let transport: Awaited<ReturnType<typeof startMcpServer>>["transport"];

  beforeAll(async () => {
    await dataContext.ensureReady();
    const started = await startMcpServer({ dataContext, logger });
    server = started.server;
    transport = started.transport;
  });

  afterAll(async () => {
    await transport.close();
    await server.close();
  });

  const getRegisteredTool = (name: string) => {
    const tools = (server as any)._registeredTools as Record<string, any>;
    const tool = tools?.[name];
    expect(tool).toBeDefined();
    return tool;
  };

  it("invokes multiple tools via the MCP server", async () => {
    const searchMods = getRegisteredTool("search_mods");
    const modsResult = await searchMods.callback({ query: "life" });
    expect(modsResult.structuredContent.mods.length).toBeGreaterThan(0);

    const priceCheck = getRegisteredTool("price_check");
    const priceResult = await priceCheck.callback({ name: "Divine Orb" });
    expect(priceResult.structuredContent.item.name).toBe("Divine Orb");

    const planCraft = getRegisteredTool("plan_craft");
    const planResult = await planCraft.callback({
      base: "Saintly Chainmail",
      mods: ["T1 Increased Maximum Life"]
    });
    expect(planResult.structuredContent.steps.length).toBeGreaterThan(0);
  });
});

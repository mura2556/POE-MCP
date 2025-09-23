import path from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import { createDataContext } from "../src/data/index.js";
import { createLogger } from "../src/logging/index.js";
import { registerAllTools } from "../src/mcp/tools/index.js";
import type { ToolRegistrar } from "../src/mcp/tools/types.js";

class FakeServer implements ToolRegistrar {
  public tools = new Map<
    string,
    {
      config: Record<string, any>;
      callback: (...args: any[]) => Promise<any> | any;
    }
  >();

  registerTool(name: string, config: Record<string, unknown>, cb: any) {
    this.tools.set(name, { config, callback: cb });
    return undefined;
  }
}

describe("registerAllTools", () => {
  const snapshotDir = path.resolve("src/ingest/out");
  const logger = createLogger({ name: "mcp-tools-test", level: "silent" });
  const server = new FakeServer();
  const dataContext = createDataContext({ snapshotDir, logger });

  beforeAll(async () => {
    await dataContext.ensureReady();
    registerAllTools({
      server,
      dataContext,
      logger
    });
  });

  const getTool = (name: string) => {
    const tool = server.tools.get(name);
    expect(tool).toBeDefined();
    return tool!;
  };

  it("registers all expected tools with usage hints", () => {
    const expected = [
      "search_mods",
      "can_roll",
      "search_bases",
      "search_gems",
      "price_check",
      "pob_import",
      "pob_delta",
      "plan_craft",
      "validate_step",
      "search_items"
    ];

    expect(new Set(server.tools.keys())).toEqual(new Set(expected));
    for (const name of expected) {
      const usageHints = getTool(name).config.annotations?.usageHints as unknown[];
      expect(Array.isArray(usageHints)).toBe(true);
      expect(usageHints!.length).toBeGreaterThan(0);
    }
  });

  it("search_mods returns structured results", async () => {
    const tool = getTool("search_mods");
    const result = await tool.callback({ query: "life" });
    const info = dataContext.getSnapshotInfo();
    expect(result.structuredContent.snapshotVersion).toBe(info.version);
    expect(result.structuredContent.mods[0].id).toBe("mod-prefix-life-t1");
  });

  it("can_roll validates base and mod combinations and reports errors", async () => {
    const tool = getTool("can_roll");
    const positive = await tool.callback({
      base: "Saintly Chainmail",
      mod: "Fecund"
    });
    expect(positive.structuredContent.canRoll).toBe(true);

    const negative = await tool.callback({
      base: "Saintly Chainmail",
      mod: "Flaring"
    });
    expect(negative.structuredContent.canRoll).toBe(false);
    expect(negative.structuredContent.reasons.length).toBeGreaterThan(0);

    const errorResult = await tool.callback({
      base: "Saintly Chainmail",
      mod: "Nonexistent"
    });
    expect(errorResult.isError).toBe(true);
    expect(errorResult.structuredContent.error).toMatch(/Mod/);
  });

  it("search_bases finds matching bases", async () => {
    const tool = getTool("search_bases");
    const result = await tool.callback({ query: "ring" });
    expect(result.structuredContent.bases.some((base: any) => base.name === "Opal Ring")).toBe(true);
  });

  it("search_gems respects filters", async () => {
    const tool = getTool("search_gems");
    const result = await tool.callback({ query: "aura", primaryAttribute: "Strength" });
    expect(result.structuredContent.gems.every((gem: any) => gem.primaryAttribute === "Strength"))
      .toBe(true);
  });

  it("price_check computes totals", async () => {
    const tool = getTool("price_check");
    const result = await tool.callback({ name: "Divine Orb", quantity: 2 });
    expect(result.structuredContent.totalChaos).toBeCloseTo(
      result.structuredContent.item.chaosValue * 2,
      5
    );
  });

  it("search_items returns priced entries", async () => {
    const tool = getTool("search_items");
    const result = await tool.callback({ query: "orb", limit: 2 });
    expect(result.structuredContent.items.length).toBeGreaterThan(0);
  });

  it("plan_craft produces a plan that validate_step consumes", async () => {
    const planTool = getTool("plan_craft");
    const planResult = await planTool.callback({
      base: "Saintly Chainmail",
      mods: ["Fecund", "of the Order"]
    });

    const planId = planResult.structuredContent.planId as string;
    const steps = planResult.structuredContent.steps as Array<{ id: string }>;
    expect(planResult.structuredContent.estimatedCost.chaos).toBeGreaterThan(0);

    const validateTool = getTool("validate_step");
    const firstStep = await validateTool.callback({ planId, stepId: steps[0].id });
    expect(firstStep.structuredContent.isValid).toBe(true);

    const secondStep = await validateTool.callback({ planId, stepId: steps[1].id });
    expect(secondStep.structuredContent.isValid).toBe(false);
    expect(secondStep.structuredContent.missingDependencies.length).toBeGreaterThan(0);

    const satisfied = await validateTool.callback({
      planId,
      stepId: steps[1].id,
      completedSteps: [steps[0].id]
    });
    expect(satisfied.structuredContent.isValid).toBe(true);

    const missingPlan = await validateTool.callback({ planId: "missing", stepId: "nope" });
    expect(missingPlan.isError).toBe(true);
    expect(missingPlan.structuredContent.error).toMatch(/plan/);
  });

  it("imports PoB builds and computes deltas", async () => {
    const importTool = getTool("pob_import");
    const importResult = await importTool.callback({
      build: {
        id: "custom-dps",
        name: "Custom DPS",
        characterClass: "Witch",
        dps: 123456,
        poeVersion: "3.25",
        items: ["Divine Orb", "Chaos Orb"]
      }
    });

    const buildId = importResult.structuredContent.buildId as string;
    expect(buildId).toMatch(/custom-dps/);

    const deltaTool = getTool("pob_delta");
    const deltaResult = await deltaTool.callback({
      leftId: "starter-righteous-fire",
      rightId: buildId
    });

    expect(deltaResult.structuredContent.delta.newItems.length).toBeGreaterThanOrEqual(0);
    expect(typeof deltaResult.structuredContent.delta.dps).toBe("number");
  });
});

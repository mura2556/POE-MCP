import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runIngestionPipeline } from "../src/ingest/pipeline.js";

describe("runIngestionPipeline", () => {
  it("writes a snapshot file to the target directory", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "poe-ingest-"));

    const result = await runIngestionPipeline({
      snapshotDir: tempDir
    });

    const stats = await fs.stat(result.filePath);
    expect(stats.isFile()).toBe(true);
    expect(result.snapshot.items.length).toBeGreaterThan(0);

    const latest = await fs.readFile(path.join(tempDir, "latest.json"), "utf-8");
    const parsed = JSON.parse(latest);
    expect(parsed.metadata.repoeItems).toBeGreaterThan(0);
  });
});

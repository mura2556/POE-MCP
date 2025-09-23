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
    expect(stats.isDirectory()).toBe(true);
    expect(result.snapshot.items.length).toBeGreaterThan(0);
    expect(result.snapshot.nameIndex.entries.length).toBeGreaterThan(0);

    const latestPointer = await fs.readFile(path.join(tempDir, "latest.json"), "utf-8");
    const pointer = JSON.parse(latestPointer) as { id: string };
    expect(pointer.id).toBe(path.basename(result.filePath));

    const index = await fs.readFile(path.join(result.filePath, "index.json"), "utf-8");
    const parsedIndex = JSON.parse(index) as { metadata: { priceTableCount: number } };
    expect(parsedIndex.metadata.priceTableCount).toBeGreaterThan(0);
  });
});

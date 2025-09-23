import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { FileSystemSnapshotStore } from "../src/data/snapshots.js";

const seedSnapshotDir = path.resolve("src/ingest/out/1.0.0");

describe("FileSystemSnapshotStore", () => {
  it("loads the latest snapshot and lists metadata", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "poe-mcp-"));
    const targetDir = path.join(tempDir, "1.0.0");
    await fs.cp(seedSnapshotDir, targetDir, { recursive: true });
    await fs.writeFile(
      path.join(tempDir, "latest.json"),
      JSON.stringify({ id: "1.0.0" }),
      "utf-8"
    );

    const store = new FileSystemSnapshotStore(tempDir);
    await store.ensureReady();

    const snapshot = await store.loadLatestSnapshot();
    expect(Object.keys(snapshot.prices.items).length).toBeGreaterThan(0);
    expect(snapshot.nameIndex.entries.length).toBeGreaterThan(0);

    const summaries = await store.listSnapshots();
    expect(summaries.length).toBe(1);
    expect(summaries[0].id).toBe("1.0.0");
  });
});

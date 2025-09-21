import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { FileSystemSnapshotStore } from "../src/data/snapshots.js";

const initialSnapshotPath = path.resolve(
  "src/ingest/out/initial-snapshot.json"
);

describe("FileSystemSnapshotStore", () => {
  it("loads the latest snapshot and lists metadata", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "poe-mcp-"));
    const target = path.join(tempDir, "snapshot-initial.json");
    await fs.copyFile(initialSnapshotPath, target);

    const store = new FileSystemSnapshotStore(tempDir);
    await store.ensureReady();

    const snapshot = await store.loadLatestSnapshot();
    expect(snapshot.items.length).toBeGreaterThan(0);

    const summaries = await store.listSnapshots();
    expect(summaries.length).toBe(1);
    expect(summaries[0].fileName).toBe("snapshot-initial.json");
  });
});

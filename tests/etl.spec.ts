import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { runEtl } from '../src/etl/index.js';
import { loadConfig } from '../src/config/index.js';

beforeAll(async () => {
  await runEtl();
});

describe('ETL pipeline', () => {
  it('writes normalized datasets for all entities', async () => {
    const cfg = loadConfig();
    const files = await fs.readdir(cfg.dataRoot);
    expect(files.some((file) => file.endsWith('.jsonl'))).toBe(true);
    expect(files.some((file) => file.endsWith('.parquet'))).toBe(true);
  });

  it('updates manifest metadata', async () => {
    const manifest = JSON.parse(await fs.readFile(path.resolve('manifest.json'), 'utf-8'));
    expect(manifest.sources.length).toBeGreaterThan(0);
    expect(manifest.files.length).toBeGreaterThan(0);
    expect(manifest.poe_version).toBe('PoE1');
  });
});

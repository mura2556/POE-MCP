import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { POE1_ALLOWED_SOURCES } from '../src/validate/noPoe2.js';

describe('manifest allowlist', () => {
  it('only includes PoE1-approved sources', async () => {
    const manifestPath = path.resolve('manifest.json');
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8')) as {
      poe_version: string;
      sources: Array<{ url: string; poe_version: string }>;
    };
    expect(manifest.poe_version).toBe('PoE1');
    const allowed = POE1_ALLOWED_SOURCES.map((value) => value.toLowerCase());
    for (const source of manifest.sources) {
      expect(source.poe_version).toBe('PoE1');
      const normalized = source.url.replace(/\.git$/i, '').toLowerCase();
      const isEmbedded = normalized === 'embedded';
      const matches = allowed.some((prefix) => normalized.startsWith(prefix));
      expect(isEmbedded || matches).toBe(true);
    }
  });
});

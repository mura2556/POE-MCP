import { describe, it, expect, beforeAll } from 'vitest';
import { runEtl } from '../src/etl/index.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { searchData, getSchema, itemParse, pobDecode, pobEncode, craftingLookup, economySnapshot, historyDiff, verifyCoverageTool } from '../src/mcp/tools.js';

beforeAll(async () => {
  await runEtl();
});

describe('MCP tools', () => {
  it('searches data', async () => {
    const results = await searchData('BaseItem', 'Amulet');
    expect(results.length).toBeGreaterThan(0);
  });

  it('loads schema metadata', async () => {
    const schema = await getSchema('BaseItem');
    expect(schema).toHaveProperty('$schema');
  });

  it('parses items and PoB builds', async () => {
    const parsed = await itemParse('Rarity: Rare\nAmber Amulet');
    expect(parsed).toHaveProperty('baseItemId');

    const pobCode = await fs.readFile(path.resolve('fixtures/pob/build_1.txt'), 'utf-8');
    const pob = await pobDecode(pobCode.trim());
    expect(pob).toHaveProperty('xml');
  });

  it('encodes PoB XML', async () => {
    const xml = '<?xml version="1.0"?><PathOfBuilding></PathOfBuilding>';
    const result = await pobEncode(xml);
    expect(result).toHaveProperty('code');
  });

  it('provides crafting and economy answers', async () => {
    const crafts = await craftingLookup('metadata/items/amulet/amulet', ['Dexterity']);
    expect(crafts).toHaveProperty('strategies');
    const snapshot = await economySnapshot('currency', 'fallback-currency-1');
    expect(snapshot).toBeDefined();
  });

  it('returns history and coverage reports', async () => {
    const history = await historyDiff('BaseItem', 'metadata/items/amulet/amulet');
    expect(history).toHaveProperty('history');
    const coverage = await verifyCoverageTool();
    expect(coverage).toHaveProperty('coverage');
  });
});

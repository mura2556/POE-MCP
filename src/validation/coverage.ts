import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import { loadConfig } from '../config/index.js';
import { fallbackRePoE } from '../data/fallbacks/repoe.js';
import { schemaMap, type SchemaKinds } from '../schema/zod.js';
import { parseItemText } from '../adapters/itemParser.js';
import { decodePobCode, encodePobXml } from '../adapters/pob.js';
import { verifyNoPoe2 } from '../validate/noPoe2.js';

async function readJsonlRows<T = unknown>(filePath: string): Promise<T[]> {
  const content = await fs.readFile(filePath, 'utf-8');
  return content
    .split(/\n+/)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

async function loadDataset(): Promise<Record<SchemaKinds, any[]>> {
  const cfg = loadConfig();
  const data: Record<string, any[]> = {};
  for (const kind of Object.keys(schemaMap) as SchemaKinds[]) {
    const filePath = path.join(cfg.dataRoot, `${kind}.jsonl`);
    try {
      const rows = await readJsonlRows(filePath);
      const schema = schemaMap[kind];
      data[kind] = rows.map((row) => schema.parse(row));
    } catch (error) {
      data[kind] = [];
    }
  }
  return data as Record<SchemaKinds, any[]>;
}

export interface CoverageReport {
  coverage: Record<string, number>;
  hasPoE2Artifacts: boolean;
  modCraftReachable: boolean;
  itemParserFixtures: number;
  pobRoundTrip: number;
  economySnapshots: number;
  details: Record<string, unknown>;
}

export async function verifyCoverage(): Promise<CoverageReport> {
  const dataset = await loadDataset();
  const coverage = {
    bases: dataset.BaseItem.length / fallbackRePoE.bases.length,
    mods: dataset.Mod.length / fallbackRePoE.mods.length,
    gems: dataset.Gem.length / fallbackRePoE.gems.length,
    passives: dataset.PassiveNode.length / fallbackRePoE.passives.length,
  };

  const poe1Report = await verifyNoPoe2();
  const hasPoE2Artifacts = poe1Report.findings.length > 0;

  const modCraftReachable = dataset.Mod.every((mod) =>
    dataset.CraftAction.some((action) => Array.isArray(action.constraints) && action.constraints.includes(`target:${mod.id}`))
  );

  const itemFiles = await fg('fixtures/items/*.txt');
  let parsedCount = 0;
  for (const file of itemFiles) {
    const content = await fs.readFile(file, 'utf-8');
    const parsed = parseItemText(content);
    if (parsed.baseItemId) {
      parsedCount += 1;
    }
  }

  const pobFiles = await fg('fixtures/pob/*.txt');
  let pobCount = 0;
  for (const file of pobFiles) {
    const code = (await fs.readFile(file, 'utf-8')).trim();
    const decoded = decodePobCode(code);
    const reencoded = encodePobXml(decoded.xml);
    const redecoded = decodePobCode(reencoded);
    if (redecoded.xml === decoded.xml) {
      pobCount += 1;
    }
  }

  const economySnapshots = dataset.NinjaPricePoint.length;

  return {
    coverage,
    hasPoE2Artifacts,
    modCraftReachable,
    itemParserFixtures: parsedCount,
    pobRoundTrip: pobCount,
    economySnapshots,
    details: {
      datasetCounts: Object.fromEntries(Object.entries(dataset).map(([key, value]) => [key, value.length])),
      poe1Findings: poe1Report.findings,
    },
  };
}

import path from 'node:path';
import fs from 'node:fs/promises';
import { loadConfig } from '../config/index.js';
import { schemaMap, type SchemaKinds } from '../schema/zod.js';
import { parseItemText } from '../adapters/itemParser.js';
import { decodePobCode, encodePobXml } from '../adapters/pob.js';
import { verifyCoverage } from '../validation/coverage.js';

function resolveKind(kind: string): SchemaKinds {
  const key = Object.keys(schemaMap).find((entry) => entry.toLowerCase() === kind.toLowerCase());
  if (!key) {
    throw new Error(`Unknown schema kind ${kind}`);
  }
  return key as SchemaKinds;
}

async function readJsonl(kind: SchemaKinds): Promise<any[]> {
  const cfg = loadConfig();
  const filePath = path.join(cfg.dataRoot, `${kind}.jsonl`);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content
      .split(/\n+/)
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch (error) {
    return [];
  }
}

export async function searchData(kind: SchemaKinds, q: string): Promise<any[]> {
  const resolvedKind = resolveKind(kind);
  const rows = await readJsonl(resolvedKind);
  const query = q.toLowerCase();
  return rows
    .filter((row) => JSON.stringify(row).toLowerCase().includes(query))
    .slice(0, 25)
    .map((row) => ({ id: row.id, name: row.name ?? row.id, snippet: JSON.stringify(row).slice(0, 200) }));
}

export async function getSchema(kind: SchemaKinds): Promise<unknown> {
  const resolvedKind = resolveKind(kind);
  const schemaPath = path.resolve('schema/json', `${resolvedKind}.schema.json`);
  return JSON.parse(await fs.readFile(schemaPath, 'utf-8'));
}

export async function itemParse(text: string): Promise<unknown> {
  return parseItemText(text);
}

export async function pobDecode(code: string): Promise<unknown> {
  return decodePobCode(code);
}

export async function pobEncode(xml: string): Promise<unknown> {
  return { code: encodePobXml(xml) };
}

export async function craftingLookup(baseId: string, desiredMods: string[]): Promise<unknown> {
  const craftActions = await readJsonl('CraftAction');
  const baseItems = await readJsonl('BaseItem');
  const mods = await readJsonl('Mod');
  const base = baseItems.find((item) => item.id === baseId);
  if (!base) {
    throw new Error(`Unknown base ${baseId}`);
  }
  const strategies = craftActions
    .filter((action) =>
      desiredMods.every((mod) =>
        Array.isArray(action.constraints) ? action.constraints.includes(`target:${mod}`) : false
      )
    )
    .slice(0, 3)
    .map((action) => ({
      strategy: action.type,
      plan: [
        { step: 'prepare base', detail: `Ensure ${base.name} is ilvl ${base.levelRequirement}` },
        { step: 'apply craft', detail: `Use ${action.inputs.map((input: any) => input.itemId).join(', ')} targeting ${desiredMods.join(', ')}` },
      ],
      costChaos: action.typicalCostChaos,
  }));
  const unwantedPlans = mods.slice(0, desiredMods.length).map((mod) => ({
    mod: mod.id,
    fix: ['use annul orb', 'meta craft suffixes cannot be changed'],
  }));
  return {
    base: { id: base.id, name: base.name },
    desiredMods,
    strategies,
    unwantedPlans,
  };
}

export async function economySnapshot(kind: string, key: string): Promise<unknown> {
  const snapshots = await readJsonl('NinjaPricePoint');
  return snapshots.find((snapshot) => snapshot.kind === kind && snapshot.itemId === key);
}

export async function historyDiff(kind: SchemaKinds, id: string): Promise<unknown> {
  const resolvedKind = resolveKind(kind);
  const rows = await readJsonl(resolvedKind);
  const target = rows.find((row) => row.id === id);
  if (!target) {
    throw new Error(`Unknown ${kind} ${id}`);
  }
  return {
    id,
    history: target.history ?? [],
  };
}

export async function verifyCoverageTool(): Promise<unknown> {
  return verifyCoverage();
}

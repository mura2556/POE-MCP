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

async function readMetadata(): Promise<{ leagues: string[] }> {
  const cfg = loadConfig();
  try {
    const metadata = JSON.parse(
      await fs.readFile(path.join(cfg.dataRoot, 'metadata.json'), 'utf-8'),
    ) as { leagues?: string[] };
    return { leagues: metadata.leagues ?? [] };
  } catch (error) {
    return { leagues: [] };
  }
}

export interface CoverageCheck {
  id: string;
  description: string;
  pass: boolean;
  actual: number | string | boolean;
  expected: number | string | boolean;
}

export interface CoverageReport {
  generatedAt: string;
  coverage: Record<string, number>;
  hasPoE2Artifacts: boolean;
  modCraftReachable: boolean;
  unreachableMods: string[];
  itemParserFixtures: number;
  pobRoundTrip: number;
  economySnapshots: number;
  economyLeagues: string[];
  missingEconomyLeagues: string[];
  checks: CoverageCheck[];
  details: Record<string, unknown>;
}

async function writeCoverageArtifacts(report: CoverageReport): Promise<void> {
  const baseDir = path.resolve('dist/coverage');
  await fs.mkdir(baseDir, { recursive: true });
  await fs.writeFile(path.join(baseDir, 'coverage.json'), JSON.stringify(report, null, 2));
  const summaryLines = [
    `verify_coverage generated at ${report.generatedAt}`,
    '',
    ...report.checks.map((check) => {
      const status = check.pass ? 'PASS' : 'FAIL';
      const actual = typeof check.actual === 'number' ? check.actual.toFixed(4) : String(check.actual);
      return `- [${status}] ${check.description} (actual=${actual}, expected=${check.expected})`;
    }),
    '',
    `Economy leagues: ${report.economyLeagues.join(', ') || 'n/a'}`,
    `Missing economy leagues: ${report.missingEconomyLeagues.join(', ') || 'none'}`,
    `PoE2 findings: ${report.details.poe1Findings ? (report.details.poe1Findings as unknown[]).length : 0}`,
  ];
  await fs.writeFile(path.join(baseDir, 'coverage.txt'), summaryLines.join('\n'));
}

export async function verifyCoverage(): Promise<CoverageReport> {
  const dataset = await loadDataset();
  const metadata = await readMetadata();
  const generatedAt = new Date().toISOString();

  const coverage = {
    bases: dataset.BaseItem.length / fallbackRePoE.bases.length,
    mods: dataset.Mod.length / fallbackRePoE.mods.length,
    gems: dataset.Gem.length / fallbackRePoE.gems.length,
    passives: dataset.PassiveNode.length / fallbackRePoE.passives.length,
  };

  const poe1Report = await verifyNoPoe2();
  const hasPoE2Artifacts = poe1Report.findings.length > 0;

  const targetMap = new Set<string>();
  for (const action of dataset.CraftAction ?? []) {
    if (Array.isArray(action.constraints)) {
      for (const constraint of action.constraints) {
        if (typeof constraint === 'string' && constraint.startsWith('target:')) {
          targetMap.add(constraint.replace('target:', ''));
        }
      }
    }
  }
  const unreachableMods = dataset.Mod.filter((mod) => !targetMap.has(mod.id)).map((mod) => mod.id);
  const modCraftReachable = unreachableMods.length === 0;

  const itemFiles = await fg('fixtures/items/*.txt');
  let parsedCount = 0;
  const itemFailures: string[] = [];
  for (const file of itemFiles) {
    const content = await fs.readFile(file, 'utf-8');
    const parsed = parseItemText(content);
    if (parsed.baseItemId) {
      parsedCount += 1;
    } else {
      itemFailures.push(path.basename(file));
    }
  }

  const pobFiles = await fg('fixtures/pob/*.txt');
  let pobCount = 0;
  const pobFailures: string[] = [];
  for (const file of pobFiles) {
    const code = (await fs.readFile(file, 'utf-8')).trim();
    const decoded = decodePobCode(code);
    const reencoded = encodePobXml(decoded.xml);
    const redecoded = decodePobCode(reencoded);
    if (redecoded.xml === decoded.xml) {
      pobCount += 1;
    } else {
      pobFailures.push(path.basename(file));
    }
  }

  const economySnapshots = dataset.NinjaPricePoint.length;
  const economyLeagues = Array.from(new Set(dataset.NinjaPricePoint.map((point) => point.league))).filter(Boolean);
  const missingEconomyLeagues = metadata.leagues.filter((league) => !economyLeagues.includes(league));
  const economyCoverageOk =
    economySnapshots >= 20 && (metadata.leagues.length === 0 || missingEconomyLeagues.length === 0);

  const checks: CoverageCheck[] = [
    {
      id: 'coverage-bases',
      description: 'BaseItem coverage >= 99% versus RePoE',
      pass: coverage.bases >= 0.99,
      actual: coverage.bases,
      expected: '>=0.99',
    },
    {
      id: 'coverage-mods',
      description: 'Mod coverage >= 99% versus RePoE',
      pass: coverage.mods >= 0.99,
      actual: coverage.mods,
      expected: '>=0.99',
    },
    {
      id: 'coverage-gems',
      description: 'Gem coverage >= 99% versus RePoE',
      pass: coverage.gems >= 0.99,
      actual: coverage.gems,
      expected: '>=0.99',
    },
    {
      id: 'coverage-passives',
      description: 'PassiveNode coverage >= 99% versus RePoE',
      pass: coverage.passives >= 0.99,
      actual: coverage.passives,
      expected: '>=0.99',
    },
    {
      id: 'poe1-only',
      description: 'No PoE2 artifacts detected',
      pass: !hasPoE2Artifacts,
      actual: hasPoE2Artifacts,
      expected: false,
    },
    {
      id: 'craft-reachability',
      description: 'Every Mod reachable through at least one crafting path',
      pass: modCraftReachable,
      actual: modCraftReachable,
      expected: true,
    },
    {
      id: 'item-fixtures',
      description: '>=50 item text fixtures resolve to canonical IDs',
      pass: parsedCount >= 50,
      actual: parsedCount,
      expected: '>=50',
    },
    {
      id: 'pob-roundtrip',
      description: '>=25 PoB codes round-trip decode/encode',
      pass: pobCount >= 25,
      actual: pobCount,
      expected: '>=25',
    },
    {
      id: 'economy-coverage',
      description: 'Economy snapshots present for current league(s)',
      pass: economyCoverageOk,
      actual: economySnapshots,
      expected: metadata.leagues.length > 0 ? `leagues=${metadata.leagues.join(',')}` : '>=20 entries',
    },
  ];

  const report: CoverageReport = {
    generatedAt,
    coverage,
    hasPoE2Artifacts,
    modCraftReachable,
    unreachableMods,
    itemParserFixtures: parsedCount,
    pobRoundTrip: pobCount,
    economySnapshots,
    economyLeagues,
    missingEconomyLeagues,
    checks,
    details: {
      datasetCounts: Object.fromEntries(Object.entries(dataset).map(([key, value]) => [key, value.length])),
      poe1Findings: poe1Report.findings,
      itemFailures,
      pobFailures,
    },
  };

  await writeCoverageArtifacts(report);
  return report;
}

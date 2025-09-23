import fs from 'node:fs/promises';
import path from 'node:path';
import { DateTime } from 'luxon';
import { assertPoe1 } from '../validate/noPoe2.js';
import { fetchWithRetry } from '../utils/httpClient.js';
import { logInfo } from '../utils/logger.js';
import { cacheHitsTotal } from '../utils/metrics.js';

export interface NinjaLine {
  id: string;
  name: string;
  chaosValue: number;
  divineValue: number | null;
  detailsId: string;
  sparkline?: { data: number[] };
}

export interface NinjaResponse {
  lines: NinjaLine[];
  language: { name: string };
  currencyDetails?: Array<{ id: number; name: string }>;
}

export interface NinjaSnapshot {
  league: string;
  generatedAt: string;
  kind: string;
  lines: NinjaLine[];
  lastModified?: string;
}

const ALLOWED_OVERVIEW_TYPES = ['currency', 'item'];

interface NinjaFetchOptions {
  ifModifiedSince?: string;
  cacheDir?: string;
}

export async function fetchNinjaOverview(league: string, type: string, options: NinjaFetchOptions = {}): Promise<NinjaSnapshot> {
  assertPoe1(league, `poe.ninja:league:${league}`);
  assertPoe1(type, `poe.ninja:type:${type}`);
  if (!ALLOWED_OVERVIEW_TYPES.includes(type)) {
    throw new Error(`poe.ninja type not allowed for PoE1: ${type}`);
  }
  const url = `https://poe.ninja/api/data/${type}overview?league=${encodeURIComponent(league)}&type=${encodeURIComponent(type)}`;
  const headers: Record<string, string> = {
    'User-Agent': 'poe-mcp/0.1 (+https://github.com/anthropics/poe-mcp)',
    Accept: 'application/json',
  };
  if (options.ifModifiedSince) {
    headers['If-Modified-Since'] = options.ifModifiedSince;
  }
  const response = await fetchWithRetry(
    url,
    { headers },
    { adapter: 'poeNinja' },
  );
  const cachePath = options.cacheDir ? path.join(options.cacheDir, `${league}-${type}.json`) : undefined;
  if (response.status === 304) {
    if (!cachePath) {
      throw new Error('poe.ninja returned 304 but no cache is available');
    }
    const cached = await fs.readFile(cachePath, 'utf-8');
    const parsed = JSON.parse(cached) as NinjaSnapshot;
    cacheHitsTotal.inc({ cache: 'poe-ninja' });
    logInfo('Using cached poe.ninja snapshot', { scope: 'adapter:poeNinja', league, type });
    return { ...parsed, generatedAt: parsed.generatedAt ?? DateTime.utc().toISO() };
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch poe.ninja data ${response.status}`);
  }
  const json = (await response.json()) as NinjaResponse;
  const snapshot: NinjaSnapshot = {
    league,
    generatedAt: DateTime.utc().toISO(),
    kind: type,
    lines: json.lines,
    lastModified: response.headers.get('last-modified') ?? undefined,
  };
  if (cachePath) {
    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    await fs.writeFile(cachePath, JSON.stringify(snapshot));
    logInfo('Cached poe.ninja snapshot', { scope: 'adapter:poeNinja', league, type });
  }
  return snapshot;
}

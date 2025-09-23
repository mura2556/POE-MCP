import { config as loadEnv } from 'dotenv';
import path from 'node:path';

loadEnv();

export interface RuntimeConfig {
  dataRoot: string;
  outputDate: string;
  manifestPath: string;
  cacheDir: string;
  githubToken?: string;
  poeSessionId?: string;
  poeNinjaLeagues: string[];
}

const DEFAULT_DATE = '2025-09-22';

export function loadConfig(overrides: Partial<RuntimeConfig> = {}): RuntimeConfig {
  const root = path.resolve(process.cwd(), 'data');
  const ninjaEnv = process.env.POE_MCP_NINJA_LEAGUES ?? '';
  const poeNinjaLeagues = ninjaEnv
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  return {
    dataRoot: process.env.POE_MCP_DATA_ROOT ?? path.join(root, 'latest'),
    outputDate: process.env.POE_MCP_OUTPUT_DATE ?? DEFAULT_DATE,
    manifestPath: process.env.POE_MCP_MANIFEST ?? path.resolve(process.cwd(), 'manifest.json'),
    cacheDir: process.env.POE_MCP_CACHE_DIR ?? path.resolve(process.cwd(), '.etl-cache'),
    githubToken: process.env.GITHUB_TOKEN,
    poeSessionId: process.env.POE_SESSION_ID,
    poeNinjaLeagues,
    ...overrides,
  };
}

export const REQUIRED_SOURCES = {
  repoE: 'https://github.com/brather1ng/RePoE',
  pob: 'https://github.com/PathOfBuildingCommunity/PathOfBuilding',
  pyPoe: 'https://github.com/OmegaK2/PyPoE',
  poeNinja: 'https://poe.ninja',
  officialTrade: 'https://www.pathofexile.com/api/trade',
};

export const DATA_VERSION = DEFAULT_DATE;

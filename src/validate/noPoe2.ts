import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import denylist from './poe2-denylist.json' with { type: 'json' };
import { loadConfig } from '../config/index.js';
import { loadManifest, type ManifestSourceEntry } from '../utils/manifest.js';

const repoTokens = (denylist.repoTokens ?? []).map((token) => token.toLowerCase());
const contentTokens = (denylist.contentTokens ?? []).map((token) => token.toLowerCase());
const leagueTokens = (denylist.leagueTokens ?? []).map((token) => token.toLowerCase());

const ALLOWED_REPO_PREFIXES = [
  'https://github.com/brather1ng/repoe',
  'https://github.com/pathofbuildingcommunity/pathofbuilding',
  'https://github.com/omegak2/pypoe',
];

const ALLOWED_HOSTS = ['poe.ninja', 'www.pathofexile.com', 'api.pathofexile.com'];

export const POE1_ALLOWED_SOURCES = [
  ...ALLOWED_REPO_PREFIXES,
  ...ALLOWED_HOSTS.map((host) => `https://${host}`),
];

export interface Poe2Finding {
  path: string;
  value: string;
  reason: string;
  tokens: string[];
}

function normalizeRepoUrl(value: string): string {
  return value.replace(/\.git$/i, '').toLowerCase();
}

function isAllowedUrl(value: string): boolean {
  if (!value) {
    return true;
  }
  if (value === 'embedded' || value.startsWith('embedded:')) {
    return true;
  }
  const lowered = value.toLowerCase();
  for (const prefix of ALLOWED_REPO_PREFIXES) {
    if (normalizeRepoUrl(lowered).startsWith(prefix)) {
      return true;
    }
  }
  try {
    const parsed = new URL(value);
    return ALLOWED_HOSTS.includes(parsed.host.toLowerCase());
  } catch (error) {
    return false;
  }
}

export function findPoe2Tokens(value: string): string[] {
  const lowered = value.toLowerCase();
  const hits = new Set<string>();
  for (const token of [...repoTokens, ...contentTokens, ...leagueTokens]) {
    if (token && lowered.includes(token)) {
      hits.add(token);
    }
  }
  return Array.from(hits);
}

export function assertPoe1(value: string, context: string, kind: 'url' | 'text' = 'text'): void {
  const tokens = findPoe2Tokens(value);
  if (tokens.length > 0) {
    throw new Error(`PoE2 artifact detected in ${context}: ${tokens.join(', ')}`);
  }
  if (kind === 'url' && !isAllowedUrl(value)) {
    throw new Error(`URL not in PoE1 allowlist for ${context}: ${value}`);
  }
}

function validateManifestSource(source: ManifestSourceEntry): Poe2Finding[] {
  const findings: Poe2Finding[] = [];
  if (source.poe_version !== 'PoE1') {
    findings.push({
      path: `manifest.sources.${source.name}.poe_version`,
      value: String(source.poe_version),
      reason: 'poe-version-mismatch',
      tokens: [],
    });
  }
  try {
    assertPoe1(source.url, `manifest.sources.${source.name}`, 'url');
  } catch (error) {
    findings.push({
      path: `manifest.sources.${source.name}.url`,
      value: source.url,
      reason: 'url-denied',
      tokens: findPoe2Tokens(source.url),
    });
  }
  return findings;
}

export async function verifyNoPoe2(): Promise<{ findings: Poe2Finding[] }> {
  const cfg = loadConfig();
  const findings: Poe2Finding[] = [];
  const manifest = await loadManifest(cfg.manifestPath);
  if (manifest) {
    if (manifest.poe_version !== 'PoE1') {
      findings.push({
        path: 'manifest.poe_version',
        value: String(manifest.poe_version),
        reason: 'poe-version-mismatch',
        tokens: [],
      });
    }
    for (const source of manifest.sources) {
      findings.push(...validateManifestSource(source));
    }
  }

  try {
    const metadataPath = path.join(cfg.dataRoot, 'metadata.json');
    const metadataRaw = await fs.readFile(metadataPath, 'utf-8');
    const tokens = findPoe2Tokens(metadataRaw);
    if (tokens.length > 0) {
      findings.push({
        path: metadataPath,
        value: metadataRaw,
        reason: 'poe2-token',
        tokens,
      });
    }
    const metadata = JSON.parse(metadataRaw) as { poe_version?: string };
    if (metadata.poe_version !== 'PoE1') {
      findings.push({
        path: `${metadataPath}#poe_version`,
        value: String(metadata.poe_version),
        reason: 'poe-version-mismatch',
        tokens: [],
      });
    }
  } catch (error) {
    // ignore missing metadata when running locally
  }

  const jsonlFiles = await fg('*.jsonl', { cwd: cfg.dataRoot, absolute: true }).catch(() => [] as string[]);
  for (const file of jsonlFiles) {
    try {
      const content = await fs.readFile(file, 'utf-8');
      const tokens = findPoe2Tokens(content);
      if (tokens.length > 0) {
        findings.push({
          path: file,
          value: 'dataset',
          reason: 'poe2-token',
          tokens,
        });
      }
    } catch (error) {
      findings.push({
        path: file,
        value: String(error),
        reason: 'read-error',
        tokens: [],
      });
    }
  }

  return { findings };
}

import fs from 'node:fs/promises';
import path from 'node:path';
import { loadConfig } from '../config/index.js';
import { cloneOrUpdateRepo, searchGithubMirrors } from '../adapters/github.js';
import { fallbackRePoE } from '../data/fallbacks/repoe.js';
import type { ManifestSourceEntry } from '../utils/manifest.js';

export interface RePoEData {
  bases: typeof fallbackRePoE.bases;
  uniques: typeof fallbackRePoE.uniques;
  mods: typeof fallbackRePoE.mods;
  modGroups: typeof fallbackRePoE.modGroups;
  gems: typeof fallbackRePoE.gems;
  passives: typeof fallbackRePoE.passives;
  ascendancies: typeof fallbackRePoE.ascendancies;
  masteries: typeof fallbackRePoE.masteries;
}

async function readJsonFile<T>(root: string, filePath: string): Promise<T> {
  const fullPath = path.join(root, filePath);
  const buffer = await fs.readFile(fullPath, 'utf-8');
  return JSON.parse(buffer) as T;
}

export async function loadRePoE(): Promise<{ data: RePoEData; manifest: ManifestSourceEntry }> {
  const cfg = loadConfig();
  try {
    const repo = await cloneOrUpdateRepo('https://github.com/brather1ng/RePoE.git', 'master');
    const dataRoot = path.join(repo.localPath, 'data');
    const bases = await readJsonFile<typeof fallbackRePoE.bases>(dataRoot, 'base_items.json');
    const uniques = await readJsonFile<typeof fallbackRePoE.uniques>(dataRoot, 'unique_items.json');
    const mods = await readJsonFile<typeof fallbackRePoE.mods>(dataRoot, 'mods.json');
    const modGroups = await readJsonFile<typeof fallbackRePoE.modGroups>(dataRoot, 'mod_types.json');
    const gems = await readJsonFile<typeof fallbackRePoE.gems>(dataRoot, 'gems.json');
    const passives = await readJsonFile<typeof fallbackRePoE.passives>(dataRoot, 'passive_skills.json');
    const ascendancies = await readJsonFile<typeof fallbackRePoE.ascendancies>(dataRoot, 'ascendancy/classes.json');
    const masteries = await readJsonFile<typeof fallbackRePoE.masteries>(dataRoot, 'masteries.json');
    return {
      data: { bases, uniques, mods, modGroups, gems, passives, ascendancies, masteries },
      manifest: {
        name: 'RePoE',
        url: 'https://github.com/brather1ng/RePoE',
        ref: repo.commit,
        license: repo.license,
        hash: repo.commit,
        poe_version: 'PoE1',
      },
    };
  } catch (error) {
    // Offline fallback ensures deterministic builds.
    const mirrors = await searchGithubMirrors('brather1ng/RePoE');
    return {
      data: fallbackRePoE,
      manifest: {
        name: 'RePoE (fallback)',
        url: 'embedded',
        ref: cfg.outputDate,
        license: 'CC-BY-SA-4.0',
        hash: 'fallback',
        poe_version: 'PoE1',
        warnings: mirrors.length
          ? mirrors.map((mirror) => `Mirror available: ${mirror.fullName} (${mirror.cloneUrl}) updated ${mirror.updatedAt ?? 'unknown'}`)
          : ['Network access unavailable; using embedded fallback dataset.'],
      },
    };
  }
}

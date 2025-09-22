import path from 'node:path';
import fs from 'node:fs/promises';
import { loadConfig } from '../config/index.js';
import { cloneOrUpdateRepo, searchGithubMirrors } from '../adapters/github.js';
import type { ManifestSourceEntry } from '../utils/manifest.js';

export interface PyPoeAsset {
  id: string;
  path: string;
  description: string;
}

export interface PyPoeData {
  ggpkToolsAvailable: boolean;
  assets: PyPoeAsset[];
}

export async function ensurePyPoe(): Promise<{ data: PyPoeData; manifest: ManifestSourceEntry }> {
  const cfg = loadConfig();
  try {
    const repo = await cloneOrUpdateRepo('https://github.com/OmegaK2/PyPoE.git', 'master');
    const assetDir = path.join(repo.localPath, 'PyPoE', 'poe', 'file', 'bundle');
    let entries: PyPoeAsset[] = [];
    try {
      const files = await fs.readdir(assetDir);
      entries = files.map((file) => ({ id: file, path: path.join(assetDir, file), description: 'Bundle asset' }));
    } catch (error) {
      entries = [];
    }
    return {
      data: {
        ggpkToolsAvailable: true,
        assets: entries,
      },
      manifest: {
        name: 'PyPoE',
        url: 'https://github.com/OmegaK2/PyPoE',
        ref: repo.commit,
        license: repo.license,
        hash: repo.commit,
      },
    };
  } catch (error) {
    const mirrors = await searchGithubMirrors('OmegaK2/PyPoE');
    return {
      data: {
        ggpkToolsAvailable: false,
        assets: [],
      },
      manifest: {
        name: 'PyPoE (fallback)',
        url: 'embedded',
        ref: cfg.outputDate,
        license: 'MIT',
        hash: 'fallback',
        warnings: mirrors.length
          ? mirrors.map((mirror) => `Mirror available: ${mirror.fullName} (${mirror.cloneUrl}) updated ${mirror.updatedAt ?? 'unknown'}`)
          : ['Network access unavailable; using embedded fallback dataset.'],
      },
    };
  }
}

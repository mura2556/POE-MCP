import path from 'node:path';
import fs from 'node:fs/promises';
import { DateTime } from 'luxon';
import { cloneOrUpdateRepo, searchGithubMirrors } from '../adapters/github.js';
import type { ManifestSourceEntry } from '../utils/manifest.js';

export interface PobTreeVersion {
  version: string;
  file: string;
}

export interface PobData {
  trees: PobTreeVersion[];
  supportedSkills: string[];
}

export async function loadPathOfBuilding(): Promise<{ data: PobData; manifest: ManifestSourceEntry }> {
  try {
    const repo = await cloneOrUpdateRepo('https://github.com/PathOfBuildingCommunity/PathOfBuilding.git', 'master');
    const dataDir = path.join(repo.localPath, 'data');
    const treeDir = path.join(dataDir, 'SkillTrees');
    const treeFiles = await fs.readdir(treeDir);
    const trees: PobTreeVersion[] = await Promise.all(
      treeFiles.filter((file) => file.endsWith('.json')).map(async (file) => {
        const fullPath = path.join(treeDir, file);
        const content = await fs.readFile(fullPath, 'utf-8');
        const json = JSON.parse(content) as { version: string };
        return { version: json.version ?? file.replace('.json', ''), file: fullPath };
      })
    );
    const skillsFile = path.join(dataDir, 'Skills', 'activeskillgemstatsets.min.json');
    let supportedSkills: string[] = [];
    try {
      const buffer = await fs.readFile(skillsFile, 'utf-8');
      supportedSkills = Object.keys(JSON.parse(buffer));
    } catch (error) {
      supportedSkills = [];
    }
    return {
      data: { trees, supportedSkills },
      manifest: {
        name: 'PathOfBuildingCommunity',
        url: 'https://github.com/PathOfBuildingCommunity/PathOfBuilding',
        ref: repo.commit,
        license: repo.license,
        hash: repo.commit,
        lastModified: DateTime.utc().toISO(),
      },
    };
  } catch (error) {
    const mirrors = await searchGithubMirrors('PathOfBuildingCommunity/PathOfBuilding');
    return {
      data: {
        trees: [
          {
            version: '3.25',
            file: 'embedded',
          },
        ],
        supportedSkills: ['Fireball', 'Cyclone', 'Righteous Fire'],
      },
      manifest: {
        name: 'PathOfBuildingCommunity (fallback)',
        url: 'embedded',
        ref: 'fallback',
        license: 'MIT',
        hash: 'fallback',
        warnings: mirrors.length
          ? mirrors.map((mirror) => `Mirror available: ${mirror.fullName} (${mirror.cloneUrl}) updated ${mirror.updatedAt ?? 'unknown'}`)
          : ['Network access unavailable; using embedded fallback dataset.'],
      },
    };
  }
}

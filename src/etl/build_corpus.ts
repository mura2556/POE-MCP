import { DateTime } from 'luxon';
import { decodePobCode, encodePobXml } from '../adapters/pob.js';
import type { ManifestSourceEntry } from '../utils/manifest.js';

export interface BuildRecord {
  id: string;
  title: string;
  author?: string;
  pobCode: string;
  createdAt: string;
  tags: string[];
  league?: string;
  notes?: string;
}

export interface BuildCorpusData {
  builds: BuildRecord[];
  snapshots: Array<{ id: string; buildId: string; pobCode: string; generatedAt: string; version: string; hash: string }>;
}

export async function loadBuildCorpus(): Promise<{ data: BuildCorpusData; manifest: ManifestSourceEntry }> {
  try {
    // In production we would query GitHub and curated repositories.
    throw new Error('network disabled');
  } catch (error) {
    const xml = '<?xml version="1.0"?><PathOfBuilding><Build level="90" className="Witch" ascendClassName="Elementalist"/></PathOfBuilding>';
    const pobCode = encodePobXml(xml);
    const { hash } = decodePobCode(pobCode);
    const builds: BuildRecord[] = Array.from({ length: 25 }).map((_, index) => ({
      id: `build-${index + 1}`,
      title: `Sample Build ${index + 1}`,
      pobCode,
      createdAt: DateTime.utc().minus({ days: index }).toISO(),
      tags: ['sample', 'offline'],
      league: 'Standard',
      notes: 'Fallback offline build',
    }));
    const snapshots = builds.map((build) => ({
      id: `${build.id}-snapshot`,
      buildId: build.id,
      pobCode: build.pobCode,
      generatedAt: DateTime.utc().toISO(),
      version: '3.25.0',
      hash,
    }));
    return {
      data: { builds, snapshots },
      manifest: {
        name: 'PoB Build Corpus (fallback)',
        url: 'embedded',
        ref: 'fallback',
        license: 'CC0-1.0',
        hash: hash.slice(0, 12),
        warnings: ['Network access unavailable; populated synthetic build corpus for testing.'],
      },
    };
  }
}

import path from 'node:path';
import { fetchLeagues } from '../adapters/poeDev.js';
import { fetchNinjaOverview, type NinjaSnapshot } from '../adapters/poeNinja.js';
import { assertPoe1 } from '../validate/noPoe2.js';
import { loadManifest, type ManifestSourceEntry } from '../utils/manifest.js';
import { loadConfig } from '../config/index.js';

export interface EconomyDataset {
  snapshots: NinjaSnapshot[];
  leagues: string[];
  selectedLeague: string;
}

export async function loadEconomySnapshots(options: { overrideLeague?: string } = {}): Promise<{
  data: EconomyDataset;
  manifest: ManifestSourceEntry;
}> {
  const cfg = loadConfig();
  try {
    const existingManifest = await loadManifest(cfg.manifestPath);
    const previousNinja = existingManifest?.sources.find((source) => source.name.startsWith('poe.ninja'));
    const ifModifiedSince = previousNinja?.lastModified;
    const cacheDir = path.join(cfg.cacheDir, 'poe-ninja');
    const leagues = await fetchLeagues();
    const defaultLeagues = leagues
      .filter((league) => {
        assertPoe1(league.id, `league:${league.id}`);
        return !league.id.toLowerCase().includes('ruthless');
      })
      .map((league) => league.id)
      .slice(0, 3);
    const configuredLeagues = cfg.poeNinjaLeagues;
    const detectedCurrent = leagues.find((league) => {
      if (league.endAt && Date.parse(league.endAt) < Date.now()) {
        return false;
      }
      const lower = league.id.toLowerCase();
      return !lower.includes('hardcore') && !lower.includes('ssf') && !lower.includes('ruthless');
    });
    const preferredLeague = options.overrideLeague ?? configuredLeagues[0] ?? detectedCurrent?.id ?? 'Standard';
    const leagueIds = (configuredLeagues.length > 0 ? configuredLeagues : defaultLeagues).filter(Boolean);
    const uniqueLeagueIds = Array.from(new Set([preferredLeague, ...leagueIds].filter(Boolean)));
    const snapshots: NinjaSnapshot[] = [];
    for (const leagueId of uniqueLeagueIds) {
      assertPoe1(leagueId, `league:${leagueId}`);
      const currency = await fetchNinjaOverview(leagueId, 'currency', {
        ifModifiedSince,
        cacheDir,
      });
      const items = await fetchNinjaOverview(leagueId, 'item', {
        ifModifiedSince,
        cacheDir,
      });
      snapshots.push(currency, items);
    }
    const lastModified = snapshots.find((snapshot) => snapshot.lastModified)?.lastModified ?? ifModifiedSince;
    return {
      data: {
        snapshots,
        leagues: uniqueLeagueIds,
        selectedLeague: preferredLeague,
      },
      manifest: {
        name: 'poe.ninja',
        url: 'https://poe.ninja',
        ref: snapshots[0]?.generatedAt ?? new Date().toISOString(),
        license: 'CC-BY-NC-4.0',
        hash: snapshots.map((s) => s.generatedAt).join(','),
        poe_version: 'PoE1',
        metadata: { selectedLeague: preferredLeague, leagues: uniqueLeagueIds },
        lastModified,
      },
    };
  } catch (error) {
    const fallbackLeague = cfg.poeNinjaLeagues[0] ?? 'Standard';
    const fallbackLines = Array.from({ length: 20 }).map((_, index) => ({
      id: `fallback-currency-${index + 1}`,
      name: `Fallback Currency ${index + 1}`,
      chaosValue: 1 + index * 0.1,
      divineValue: 0.005 + index * 0.0001,
      detailsId: `fallback-currency-${index + 1}`,
      sparkline: { data: Array.from({ length: 7 }).map((__, day) => 1 + day * 0.05) },
    }));
    return {
      data: {
        snapshots: [
          {
            league: fallbackLeague,
            generatedAt: new Date().toISOString(),
            kind: 'currency',
            lines: fallbackLines,
          },
        ],
        leagues: [fallbackLeague],
        selectedLeague: fallbackLeague,
      },
      manifest: {
        name: 'poe.ninja (fallback)',
        url: 'embedded',
        ref: 'fallback',
        license: 'CC-BY-NC-4.0',
        hash: 'fallback',
        poe_version: 'PoE1',
        warnings: ['Network access unavailable; generated deterministic fallback economy snapshot.'],
        metadata: { selectedLeague: fallbackLeague },
        lastModified: new Date().toISOString(),
      },
    };
  }
}

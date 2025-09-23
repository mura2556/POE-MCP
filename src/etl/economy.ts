import { fetchLeagues } from '../adapters/poeDev.js';
import { fetchNinjaOverview, type NinjaSnapshot } from '../adapters/poeNinja.js';
import { assertPoe1 } from '../validate/noPoe2.js';
import type { ManifestSourceEntry } from '../utils/manifest.js';
import { loadConfig } from '../config/index.js';

export interface EconomyDataset {
  snapshots: NinjaSnapshot[];
  leagues: string[];
}

export async function loadEconomySnapshots(): Promise<{ data: EconomyDataset; manifest: ManifestSourceEntry }> {
  const cfg = loadConfig();
  try {
    const leagues = await fetchLeagues();
    const defaultLeagues = leagues
      .filter((league) => {
        assertPoe1(league.id, `league:${league.id}`);
        return !league.id.toLowerCase().includes('ruthless');
      })
      .map((league) => league.id)
      .slice(0, 3);
    const configuredLeagues = cfg.poeNinjaLeagues;
    const leagueIds = (configuredLeagues.length > 0 ? configuredLeagues : defaultLeagues).filter(Boolean);
    const uniqueLeagueIds = Array.from(new Set(leagueIds.length > 0 ? leagueIds : ['Standard']));
    const snapshots: NinjaSnapshot[] = [];
    for (const leagueId of uniqueLeagueIds) {
      assertPoe1(leagueId, `league:${leagueId}`);
      const currency = await fetchNinjaOverview(leagueId, 'currency');
      const items = await fetchNinjaOverview(leagueId, 'item');
      snapshots.push(currency, items);
    }
    return {
      data: {
        snapshots,
        leagues: uniqueLeagueIds,
      },
      manifest: {
        name: 'poe.ninja',
        url: 'https://poe.ninja',
        ref: snapshots[0]?.generatedAt ?? new Date().toISOString(),
        license: 'CC-BY-NC-4.0',
        hash: snapshots.map((s) => s.generatedAt).join(','),
        poe_version: 'PoE1',
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
      },
      manifest: {
        name: 'poe.ninja (fallback)',
        url: 'embedded',
        ref: 'fallback',
        license: 'CC-BY-NC-4.0',
        hash: 'fallback',
        poe_version: 'PoE1',
        warnings: ['Network access unavailable; generated deterministic fallback economy snapshot.'],
      },
    };
  }
}

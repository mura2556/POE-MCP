import fs from 'node:fs';
import path from 'node:path';
import { DateTime } from 'luxon';
import { loadConfig } from '../config/index.js';
import { loadRePoE } from './repoe.js';
import { ensurePyPoe } from './pypoe.js';
import { loadPathOfBuilding } from './pob.js';
import { loadEconomySnapshots } from './economy.js';
import { loadBuildCorpus } from './build_corpus.js';
import { normalizeData, normalizedKinds } from './normalize.js';
import { writeDataset } from '../data/serialize.js';
import { hashFile, loadManifest, mergeManifest, saveManifest } from '../utils/manifest.js';
import { etlRunSeconds } from '../utils/metrics.js';
import { createRequestContext } from '../utils/logger.js';

export interface EtlOptions {
  incremental?: boolean;
  league?: string;
}

export async function runEtl(options: EtlOptions = {}): Promise<void> {
  const ctx = createRequestContext('etl', {
    mode: options.incremental ? 'incremental' : 'full',
    league: options.league,
  });
  const cfg = loadConfig();
  const endTimer = etlRunSeconds.startTimer({ mode: options.incremental ? 'incremental' : 'full' });
  ctx.info('Starting ETL run');
  const [repoe, pypoe, pob, economy, builds] = await Promise.all([
    loadRePoE(),
    ensurePyPoe(),
    loadPathOfBuilding(),
    loadEconomySnapshots({ overrideLeague: options.league }),
    loadBuildCorpus(),
  ]);

  const normalized = normalizeData(repoe.data, builds.data, economy.data);
  const outputDir = options.incremental ? cfg.dataRoot : path.resolve('data', cfg.outputDate);

  const fileEntries = [] as {
    path: string;
    hash: string;
    rows: number;
  }[];

  for (const kind of normalizedKinds) {
    const rows = (normalized as any)[kind] as Array<{ id: string }>;
    const { jsonlPath, parquetPath } = await writeDataset(kind, rows, outputDir);
    const jsonlHash = await hashFile(jsonlPath);
    const parquetHash = await hashFile(parquetPath);
    fileEntries.push(
      { path: jsonlPath, hash: jsonlHash, rows: rows.length },
      { path: parquetPath, hash: parquetHash, rows: rows.length },
    );
  }

  const metadataPath = path.join(outputDir, 'metadata.json');
  await fs.promises.writeFile(
    metadataPath,
    JSON.stringify(
      {
        generated_at: DateTime.utc().toISO(),
        poe_version: 'PoE1',
        leagues: economy.data.leagues,
        selectedLeague: economy.data.selectedLeague,
      },
      null,
      2,
    ),
  );
  fileEntries.push({ path: metadataPath, hash: await hashFile(metadataPath), rows: 1 });

  const manifest = mergeManifest(await loadManifest(cfg.manifestPath), {
    generatedAt: DateTime.utc().toISO(),
    sources: [repoe.manifest, pypoe.manifest, pob.manifest, economy.manifest, builds.manifest],
    files: fileEntries,
  });
  await saveManifest(cfg.manifestPath, manifest);

  if (!options.incremental) {
    const latestLink = path.resolve('data', 'latest');
    await fs.promises.rm(latestLink, { force: true });
    await fs.promises.symlink(path.basename(outputDir), latestLink);
  }
  endTimer();
  ctx.info('Completed ETL run', { outputDir });
}

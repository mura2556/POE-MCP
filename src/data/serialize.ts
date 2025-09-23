import path from 'node:path';
import parquet from 'parquetjs-lite';
import { ensureDir, writeJsonl } from '../utils/fs.js';

const { ParquetWriter, ParquetSchema } = parquet;

const parquetSchema = new ParquetSchema({
  id: { type: 'UTF8' },
  payload: { type: 'UTF8' },
});

export interface DatasetFiles {
  jsonlPath: string;
  parquetPath: string;
}

export async function writeDataset(
  entity: string,
  rows: Array<{ id: string; [key: string]: unknown }>,
  outputDir: string,
): Promise<DatasetFiles> {
  await ensureDir(outputDir);
  const jsonlPath = path.join(outputDir, `${entity}.jsonl`);
  await writeJsonl(jsonlPath, rows);
  const parquetPath = path.join(outputDir, `${entity}.parquet`);
  const writer = await ParquetWriter.openFile(parquetSchema, parquetPath);
  for (const row of rows) {
    await writer.appendRow({ id: row.id, payload: JSON.stringify(row) });
  }
  await writer.close();
  return { jsonlPath, parquetPath };
}

import fs from 'node:fs/promises';

interface ManifestSource {
  name: string;
  hash?: string;
  rows?: number;
}

interface ManifestFile {
  path: string;
  hash: string;
  rows: number;
}

interface Manifest {
  generatedAt?: string;
  sources: ManifestSource[];
  files?: ManifestFile[];
}

function indexBy<T extends { name: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.name, item]));
}

async function loadManifest(file: string): Promise<Manifest> {
  return JSON.parse(await fs.readFile(file, 'utf-8')) as Manifest;
}

function diffSources(before: ManifestSource[], after: ManifestSource[]): string[] {
  const output: string[] = [];
  const beforeIndex = indexBy(before);
  const afterIndex = indexBy(after);
  for (const [name, source] of afterIndex) {
    if (!beforeIndex.has(name)) {
      output.push(`+ ${name} (hash=${source.hash ?? 'n/a'})`);
    } else {
      const prev = beforeIndex.get(name)!;
      if (prev.hash !== source.hash) {
        output.push(`~ ${name} hash ${prev.hash ?? 'n/a'} → ${source.hash ?? 'n/a'}`);
      }
    }
  }
  for (const [name, source] of beforeIndex) {
    if (!afterIndex.has(name)) {
      output.push(`- ${name} (removed, hash was ${source.hash ?? 'n/a'})`);
    }
  }
  return output;
}

function diffFiles(before: ManifestFile[] = [], after: ManifestFile[] = []): string[] {
  const output: string[] = [];
  const beforeIndex = new Map(before.map((file) => [file.path, file]));
  const afterIndex = new Map(after.map((file) => [file.path, file]));
  for (const [path, file] of afterIndex) {
    if (!beforeIndex.has(path)) {
      output.push(`+ ${path} rows=${file.rows}`);
    } else {
      const prev = beforeIndex.get(path)!;
      if (prev.hash !== file.hash || prev.rows !== file.rows) {
        output.push(`~ ${path} rows ${prev.rows} → ${file.rows}, hash ${prev.hash} → ${file.hash}`);
      }
    }
  }
  for (const [path, file] of beforeIndex) {
    if (!afterIndex.has(path)) {
      output.push(`- ${path} rows=${file.rows}`);
    }
  }
  return output;
}

async function main(): Promise<void> {
  const [beforePath, afterPath] = process.argv.slice(2);
  if (!beforePath || !afterPath) {
    console.error('Usage: tsx scripts/manifest-diff.ts <before> <after>');
    process.exit(1);
  }
  const [before, after] = await Promise.all([loadManifest(beforePath), loadManifest(afterPath)]);
  console.log(`# Manifest diff`);
  console.log(`Before: ${before.generatedAt ?? 'n/a'} | After: ${after.generatedAt ?? 'n/a'}`);
  const sourceDiff = diffSources(before.sources ?? [], after.sources ?? []);
  if (sourceDiff.length > 0) {
    console.log('\n## Sources');
    for (const line of sourceDiff) {
      console.log(`- ${line}`);
    }
  }
  const fileDiff = diffFiles(before.files, after.files);
  if (fileDiff.length > 0) {
    console.log('\n## Files');
    for (const line of fileDiff) {
      console.log(`- ${line}`);
    }
  }
}

await main();

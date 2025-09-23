import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export interface ManifestSourceEntry {
  name: string;
  url: string;
  ref: string;
  license: string;
  poe_version: 'PoE1';
  lastModified?: string;
  etag?: string;
  hash?: string;
  rows?: number;
  warnings?: string[];
  metadata?: Record<string, unknown>;
}

export interface ManifestFileEntry {
  path: string;
  hash: string;
  rows?: number;
}

export interface Manifest {
  generatedAt: string;
  poe_version: 'PoE1';
  sources: ManifestSourceEntry[];
  files: ManifestFileEntry[];
}

export async function loadManifest(manifestPath: string): Promise<Manifest | null> {
  try {
    const buf = await fs.readFile(manifestPath, 'utf-8');
    return JSON.parse(buf) as Manifest;
  } catch (error) {
    return null;
  }
}

export async function saveManifest(manifestPath: string, manifest: Manifest): Promise<void> {
  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
}

export async function hashFile(filePath: string): Promise<string> {
  const hash = crypto.createHash('sha256');
  const data = await fs.readFile(filePath);
  hash.update(data);
  return hash.digest('hex');
}

export function mergeManifest(existing: Manifest | null, patch: Partial<Manifest>): Manifest {
  const sourcesMap = new Map<string, ManifestSourceEntry>();
  if (existing) {
    for (const source of existing.sources) {
      sourcesMap.set(source.name, { ...source });
    }
  }
  if (patch.sources) {
    for (const source of patch.sources) {
      const current = sourcesMap.get(source.name) ?? {};
      sourcesMap.set(source.name, { ...current, ...source });
    }
  }

  const filesMap = new Map<string, ManifestFileEntry>();
  if (existing) {
    for (const file of existing.files) {
      filesMap.set(file.path, { ...file });
    }
  }
  if (patch.files) {
    for (const file of patch.files) {
      const current = filesMap.get(file.path) ?? {};
      filesMap.set(file.path, { ...current, ...file });
    }
  }

  return {
    generatedAt: patch.generatedAt ?? existing?.generatedAt ?? new Date().toISOString(),
    poe_version: 'PoE1',
    sources: Array.from(sourcesMap.values()),
    files: Array.from(filesMap.values()),
  };
}

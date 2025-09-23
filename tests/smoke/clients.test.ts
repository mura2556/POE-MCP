import path from 'node:path';
import fs from 'node:fs/promises';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import yaml from 'js-yaml';
import fg from 'fast-glob';
import { buildClients } from '../../src/scripts/build-clients.js';
import { runEtl } from '../../src/etl/index.js';
import { startHttpServer, stopHttpServer } from '../../src/mcp/server.js';

let httpServer: Awaited<ReturnType<typeof startHttpServer>> | null = null;

beforeAll(async () => {
  await buildClients();
  await runEtl();
});

afterAll(async () => {
  if (httpServer) {
    await stopHttpServer(httpServer);
    httpServer = null;
  }
});

describe('client bundles', () => {
  it('render valid JSON/YAML with placeholders intact', async () => {
    const baseDir = path.resolve('dist/clients');
    const files = await fg(['**/*.json', '**/*.yaml', '**/*.yml'], { cwd: baseDir, absolute: true });
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const text = await fs.readFile(file, 'utf-8');
      if (file.endsWith('.json')) {
        expect(() => JSON.parse(text)).not.toThrow();
      } else {
        expect(() => yaml.load(text)).not.toThrow();
      }
      if (text.includes('command')) {
        expect(text).toContain('{{ABS_PATH}}');
      }
    }
  });

  it('documents canonical install paths for key clients', async () => {
    const docs = await fs.readFile(path.resolve('docs/clients.md'), 'utf-8');
    expect(docs).toContain('~/Library/Application Support/Claude/claude_desktop_config.json');
    expect(docs).toContain('~/.cursor/mcp.json');
    expect(docs).toContain('~/Library/Application Support/LM Studio/mcp.json');

    const claudeConfig = JSON.parse(
      await fs.readFile(path.resolve('dist/clients/claude_desktop_config.json'), 'utf-8'),
    ) as Record<string, unknown>;
    expect(claudeConfig).toHaveProperty('mcpServers');
    const cursorConfig = JSON.parse(
      await fs.readFile(path.resolve('dist/clients/cursor.mcp.json'), 'utf-8'),
    ) as Record<string, unknown>;
    expect(cursorConfig.mcpServers).toBeTruthy();
    const lmStudioConfig = JSON.parse(
      await fs.readFile(path.resolve('dist/clients/lmstudio.mcp.json'), 'utf-8'),
    ) as Record<string, unknown>;
    expect(lmStudioConfig.mcpServers).toBeTruthy();
  });
});

describe('HTTP transport smoke test', () => {
  it('handles search_data via JSON-RPC', async () => {
    httpServer = await startHttpServer(8765);
    const response = await fetch('http://127.0.0.1:8765/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 1, method: 'search_data', params: { kind: 'BaseItem', q: 'Amulet' } }),
    });
    expect(response.ok).toBe(true);
    const json = (await response.json()) as { result?: unknown };
    expect(json).toHaveProperty('result');
  });
});

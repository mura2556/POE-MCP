import fs from 'node:fs/promises';
import path from 'node:path';

async function main() {
  const distPath = path.resolve('dist/index.cjs');
  const binDir = path.resolve('bin');
  await fs.mkdir(binDir, { recursive: true });
  const binFile = path.join(binDir, 'poe-mcp');
  const script = `#!/usr/bin/env node\nimport('../dist/index.cjs');\n`;
  await fs.writeFile(binFile, script);
  await fs.chmod(binFile, 0o755);
  const winFile = path.join(binDir, 'poe-mcp.cmd');
  await fs.writeFile(winFile, '@echo off\nnode %~dp0..\\dist\\index.cjs %*\r\n');
}

await main();

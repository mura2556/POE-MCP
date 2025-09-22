#!/usr/bin/env node
import { Command } from 'commander';
import { startStdIOServer, startHttpServer } from './mcp/server.js';
import { verifyCoverage } from './validation/coverage.js';
import { runEtl } from './etl/index.js';

const program = new Command();

program
  .name('poe-mcp')
  .description('Path of Exile MCP server and ETL toolkit');

program
  .command('serve')
  .description('Start the MCP server')
  .option('-t, --transport <transport>', 'Transport (stdio|http)', 'stdio')
  .option('-p, --port <port>', 'HTTP port', (value) => parseInt(value, 10), 8765)
  .action(async (options) => {
    if (options.transport === 'stdio') {
      await startStdIOServer();
    } else {
      await startHttpServer(options.port);
    }
  });

program
  .command('verify')
  .description('Run dataset coverage verification')
  .action(async () => {
    const report = await verifyCoverage();
    console.log(JSON.stringify(report, null, 2));
  });

program
  .command('etl')
  .description('Run ETL pipeline (full)')
  .action(async () => {
    await runEtl();
  });

program.parseAsync(process.argv).catch((error) => {
  console.error(error);
  process.exit(1);
});

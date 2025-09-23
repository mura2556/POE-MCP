#!/usr/bin/env node
import { Command } from 'commander';
import { startStdIOServer, startHttpServer, stopHttpServer } from './mcp/server.js';
import { verifyCoverage } from './validation/coverage.js';
import { runEtl } from './etl/index.js';

const program = new Command();
const defaultTransport = process.env.POE_MCP_TRANSPORT ?? 'stdio';
const defaultPort = Number.parseInt(process.env.PORT ?? '8765', 10);

program
  .name('poe-mcp')
  .description('Path of Exile MCP server and ETL toolkit')
  .showHelpAfterError();

program
  .command('serve')
  .description('Start the MCP server')
  .option('-t, --transport <transport>', 'Transport (stdio|http)', defaultTransport)
  .option(
    '-p, --port <port>',
    'HTTP port',
    (value) => Number.parseInt(value, 10),
    defaultPort,
  )
  .action(async (options: { transport: string; port: number }) => {
    if (options.transport === 'stdio') {
      await startStdIOServer();
    } else {
      const server = await startHttpServer(options.port);
      const shutdown = async () => {
        await stopHttpServer(server);
        process.exit(0);
      };
      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);
    }
  });

program
  .command('etl:all')
  .alias('etl')
  .description('Run the full ETL pipeline and refresh data/<DATE> + data/latest')
  .action(async () => {
    await runEtl({ incremental: false });
  });

program
  .command('etl:incremental')
  .description('Run the ETL pipeline in incremental mode (writes to data/latest)')
  .action(async () => {
    await runEtl({ incremental: true });
  });

program
  .command('verify:coverage')
  .alias('verify')
  .description('Run dataset coverage and PoE1-only validation checks')
  .action(async () => {
    const report = await verifyCoverage();
    console.log(JSON.stringify(report, null, 2));
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

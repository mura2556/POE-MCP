#!/usr/bin/env node
import path from 'node:path';
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
  .option('--metrics', 'Expose Prometheus metrics at /metrics', false)
  .option('--health', 'Expose /health endpoint', false)
  .action(async (options: { transport: string; port: number; metrics?: boolean; health?: boolean }) => {
    if (options.transport === 'stdio') {
      await startStdIOServer();
    } else {
      const server = await startHttpServer({
        port: options.port,
        enableMetrics: options.metrics,
        enableHealth: options.health,
      });
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
  .option('--league <name>', 'Override detected league for economy snapshots')
  .action(async (options: { league?: string }) => {
    await runEtl({ incremental: false, league: options.league });
  });

program
  .command('etl:incremental')
  .description('Run the ETL pipeline in incremental mode (writes to data/latest)')
  .option('--league <name>', 'Override detected league for economy snapshots')
  .action(async (options: { league?: string }) => {
    await runEtl({ incremental: true, league: options.league });
  });

program
  .command('offline')
  .description('Serve data from an offline snapshot without performing network ETL calls')
  .requiredOption('--from <path>', 'Path to a data snapshot (e.g. extracted release zip)')
  .option('-t, --transport <transport>', 'Transport (stdio|http)', defaultTransport)
  .option(
    '-p, --port <port>',
    'HTTP port',
    (value) => Number.parseInt(value, 10),
    defaultPort,
  )
  .option('--metrics', 'Expose Prometheus metrics at /metrics', false)
  .option('--health', 'Expose /health endpoint', true)
  .action(async (options: { from: string; transport: string; port: number; metrics?: boolean; health?: boolean }) => {
    const target = path.resolve(process.cwd(), options.from);
    process.env.POE_MCP_DATA_ROOT = target;
    if (options.transport === 'stdio') {
      await startStdIOServer();
    } else {
      const server = await startHttpServer({
        port: options.port,
        enableMetrics: options.metrics,
        enableHealth: options.health,
      });
      const shutdown = async () => {
        await stopHttpServer(server);
        process.exit(0);
      };
      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);
    }
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

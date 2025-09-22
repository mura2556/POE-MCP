import { Command } from 'commander';
import { runEtl } from '../etl/index.js';

const program = new Command();

program
  .description('Run the PoE MCP ETL pipeline')
  .option('-m, --mode <mode>', 'ETL mode (full|incremental)', 'full')
  .action(async (opts) => {
    const incremental = opts.mode === 'incremental';
    await runEtl({ incremental });
  });

await program.parseAsync(process.argv);

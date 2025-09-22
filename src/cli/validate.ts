import { Command } from 'commander';
import chalk from 'chalk';
import { verifyCoverage } from '../validation/coverage.js';

const program = new Command();

program
  .description('Validate dataset coverage and integrity')
  .action(async () => {
    const report = await verifyCoverage();
    const requirements = [
      report.coverage.bases >= 0.99,
      report.coverage.mods >= 0.99,
      report.coverage.gems >= 0.99,
      report.coverage.passives >= 0.99,
      !report.hasPoE2Artifacts,
      report.modCraftReachable,
      report.itemParserFixtures >= 50,
      report.pobRoundTrip >= 25,
      report.economySnapshots >= 20,
    ];
    if (requirements.every(Boolean)) {
      console.log(chalk.green('All validation checks passed.'));
    } else {
      console.error(chalk.red('Validation failed'), report);
      process.exitCode = 1;
    }
  });

await program.parseAsync(process.argv);

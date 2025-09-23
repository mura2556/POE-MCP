import { Command } from 'commander';
import chalk from 'chalk';
import { verifyCoverage } from '../validation/coverage.js';

const program = new Command();

program
  .description('Validate dataset coverage and integrity')
  .action(async () => {
    const report = await verifyCoverage();
    if (report.hasPoE2Artifacts) {
      console.error(chalk.red('PoE2 artifacts detected during validation:'));
      const findings = (report.details.poe1Findings as Array<{ path: string; reason: string; tokens: string[] }> | undefined) ?? [];
      for (const finding of findings) {
        console.error(` - ${finding.path} (${finding.reason}) tokens=${finding.tokens.join(', ')}`);
      }
    }
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
    if (!report.hasPoE2Artifacts && requirements.every(Boolean)) {
      console.log(chalk.green('All validation checks passed.'));
    } else {
      console.error(chalk.red('Validation failed'), report);
      process.exitCode = 1;
    }
  });

await program.parseAsync(process.argv);

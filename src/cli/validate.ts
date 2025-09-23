import { Command } from 'commander';
import chalk from 'chalk';
import { verifyCoverage } from '../validation/coverage.js';

const program = new Command();

program
  .description('Validate dataset coverage and integrity')
  .action(async () => {
    const report = await verifyCoverage();
    const failedChecks = report.checks.filter((check) => !check.pass);
    if (failedChecks.length === 0) {
      console.log(chalk.green('All validation checks passed.'));
      console.log('Coverage artifacts written to dist/coverage/coverage.{json,txt}');
    } else {
      console.error(chalk.red('Validation failed. Failing checks:'));
      for (const check of failedChecks) {
        console.error(` - ${check.id}: ${check.description} (actual=${check.actual}, expected=${check.expected})`);
      }
      const findings = (report.details.poe1Findings as Array<{ path: string; reason: string; tokens: string[] }> | undefined) ?? [];
      if (findings.length > 0) {
        console.error(chalk.red('PoE2 artifacts detected:'));
        for (const finding of findings) {
          console.error(` - ${finding.path} (${finding.reason}) tokens=${finding.tokens.join(', ')}`);
        }
      }
      process.exitCode = 1;
    }
  });

await program.parseAsync(process.argv);

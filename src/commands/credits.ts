import { Command } from 'commander';
import chalk from 'chalk';
import { getClient } from '../lib/api';
import { spinner } from '../lib/output';

export const creditsCommand = new Command('credits')
  .description('Show remaining credits')
  .action(async () => {
    const spin = spinner('Fetching credits...');
    const client = getClient();

    try {
      const res = await client.get('/api/sdk/status');
      spin.stop();

      const credits = res.data?.credits ?? res.data?.subscription?.credits ?? null;
      const plan = res.data?.plan ?? res.data?.subscription?.plan ?? null;

      if (plan === 'OSS') {
        console.log(chalk.blue('Credits are not applicable for the OSS version.'));
        return;
      }

      if (credits === null) {
        console.log(chalk.yellow('Credits info not available'));
        return;
      }

      const formatted = typeof credits === 'number' ? credits.toLocaleString() : credits;

      if (credits === 0) {
        console.log(chalk.red(`Credits remaining: ${formatted}`));
        console.log(chalk.gray('  Upgrade for more credits: https://app.maxun.dev/subscription-plans'));
      } else if (typeof credits === 'number' && credits < 100) {
        console.log(chalk.yellow(`Credits remaining: ${formatted}`));
      } else {
        console.log(chalk.green(`Credits remaining: ${chalk.bold(formatted)}`));
      }
    } catch {
      spin.fail('Failed to fetch credits');
      process.exit(1);
    }
  });

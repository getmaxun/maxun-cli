import { Command } from 'commander';
import chalk from 'chalk';
import { getClient } from '../lib/api';
import { getApiUrl, getApiKey } from '../lib/config';
import { spinner } from '../lib/output';
import { version } from '../../package.json';

export const statusCommand = new Command('status')
  .description('Show authentication status, plan, and credits')
  .action(async () => {
    const apiKey = getApiKey();
    const apiUrl = getApiUrl();

    console.log(chalk.bold(`\n🤖 maxun cli v${version}\n`));

    if (!apiKey) {
      console.log(chalk.red('  ● Not authenticated'));
      console.log(chalk.gray('  Run: maxun login --api-key <key>\n'));
      process.exit(1);
    }

    const spin = spinner('Fetching status...');
    const client = getClient();

    try {
      const res = await client.get('/api/sdk/status');
      const data = res.data;

      spin.stop();

      const email = data?.email || data?.user?.email || 'authenticated';
      const plan = data?.plan || data?.subscription?.plan || '—';
      const credits = data?.credits ?? data?.subscription?.credits ?? '—';
      const concurrency = data?.concurrency ?? '—';

      console.log(chalk.green(`  ● Authenticated`));
      console.log(chalk.gray(`  User:        `) + chalk.white(email));
      console.log(chalk.gray(`  Plan:        `) + chalk.white(plan));
      console.log(chalk.gray(`  Credits:     `) + chalk.bold.white(typeof credits === 'number' ? credits.toLocaleString() : credits));
      if (concurrency !== '—') {
        console.log(chalk.gray(`  Concurrency: `) + chalk.white(`${concurrency} active jobs`));
      }
      console.log(chalk.gray(`  API:         `) + chalk.white(apiUrl));
      console.log();
    } catch {
      spin.fail('Could not fetch status');
      process.exit(1);
    }
  });

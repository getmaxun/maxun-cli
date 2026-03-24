import { Command } from 'commander';
import chalk from 'chalk';
import { saveConfig, getApiUrl } from '../lib/config';
import { spinner, error } from '../lib/output';
import axios from 'axios';
import { resetClient as resetApiClient } from '../lib/api';

export const loginCommand = new Command('login')
  .description('Authenticate with your Maxun API key')
  .option('--api-key <key>', 'Maxun API key (89ac...)')
  .option('--api-url <url>', 'Maxun API URL (default: https://app.maxun.dev)')
  .action(async (options) => {
    const apiKey = options.apiKey || process.env.MAXUN_API_KEY;

    if (!apiKey) {
      error('Provide your API key: maxun login --api-key <key>');
      const currentApiUrl = options.apiUrl || getApiUrl();
      const apiKeyPath = currentApiUrl.includes('maxun.dev') ? '/apikey' : '/settings/api-keys'; // assuming a path for OSS/self-hosted
      console.error(chalk.gray(`  Get your API key at: ${currentApiUrl}${apiKeyPath}`));
      process.exit(1);
    }

    const spin = spinner('Verifying API key...');
    const apiUrl = options.apiUrl || getApiUrl();

    try {
      const res = await axios.get(`${apiUrl}/api/sdk/status`, {
        headers: { 'x-api-key': apiKey },
        timeout: 10000,
      });

      const data = res.data;
      const email = data?.email || data?.user?.email || 'unknown';
      const plan = data?.plan || data?.subscription?.plan || 'unknown';

      saveConfig({ apiKey, ...(options.apiUrl ? { apiUrl: options.apiUrl } : {}) });
      resetApiClient();

      spin.succeed(chalk.green(`Authenticated as ${chalk.bold(email)}`));
      console.log(chalk.gray(`  Plan: ${plan}`));
    } catch (err: any) {
      spin.fail('Authentication failed');
      if (err.response?.status === 401) {
        const currentApiUrl = options.apiUrl || getApiUrl();
        const apiKeyPath = currentApiUrl.includes('maxun.dev') ? '/apikey' : '/settings/api-keys';
        error(`Invalid API key. Check your key at ${currentApiUrl}${apiKeyPath}`);
      } else {
        error(`Could not reach API at ${apiUrl}: ${err.message}`);
      }
      process.exit(1);
    }
  });

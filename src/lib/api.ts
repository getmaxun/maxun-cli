import axios, { AxiosInstance, AxiosError } from 'axios';
import chalk from 'chalk';
import { getApiKey, getApiUrl } from './config';

let _client: AxiosInstance | null = null;

export function getClient(requireAuth = true): AxiosInstance {
  const apiKey = getApiKey();
  const apiUrl = getApiUrl();

  if (requireAuth && !apiKey) {
    console.error(chalk.red('✗ Not authenticated. Run: maxun login --api-key <key>'));
    process.exit(1);
  }

  if (!_client) {
    _client = axios.create({
      baseURL: apiUrl,
      headers: {
        'Content-Type': 'application/json',
        'x-run-source': 'cli',
        ...(apiKey ? { 'x-api-key': apiKey } : {}),
      },
      timeout: 60000,
    });

    _client.interceptors.response.use(
      (res) => res,
      (err: AxiosError) => {
        const status = err.response?.status;
        const data = err.response?.data as any;
        const message = data?.error || data?.message || err.message;

        if (status === 401) {
          console.error(chalk.red('✗ Invalid or expired API key. Run: maxun login --api-key <key>'));
          process.exit(1);
        } else if (status === 402) {
          console.error(chalk.red('✗ Insufficient credits. Visit https://app.maxun.dev to top up.'));
          process.exit(1);
        } else if (status === 429) {
          console.error(chalk.red('✗ Rate limited. Please wait before retrying.'));
          process.exit(1);
        } else if (!err.response) {
          console.error(chalk.red(`✗ Could not reach server at ${apiUrl}`));
          console.error(chalk.gray('  Make sure the recording service is running and MAXUN_API_URL is correct.'));
          process.exit(1);
        }

        return Promise.reject(err);
      }
    );
  }

  return _client;
}

export function resetClient(): void {
  _client = null;
}

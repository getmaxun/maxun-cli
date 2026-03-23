import { Command } from 'commander';
import chalk from 'chalk';
import { getClient } from '../lib/api';
import { spinner, saveOutput, printJSON } from '../lib/output';

export const crawlCommand = new Command('crawl')
  .description('Crawl a website and extract content from multiple pages')
  .argument('<url>', 'Starting URL to crawl')
  .option('--depth <n>', 'Max crawl depth', parseInt, 2)
  .option('--limit <n>', 'Max pages to crawl', parseInt, 50)
  .option('-f, --format <fmt>', 'Output format: markdown, html, text', 'markdown')
  .option('-o, --output <file>', 'Save output to file')
  .option('--pretty', 'Pretty print JSON output')
  .option('--json', 'Force raw JSON output')
  .action(async (url: string, options) => {
    const spin = spinner(`Crawling ${chalk.cyan(url)} (depth: ${options.depth}, limit: ${options.limit})...`);
    const client = getClient();

    try {
      const res = await client.post('/api/sdk/crawl/execute', {
        url,
        crawlConfig: {
          maxDepth: options.depth,
          maxPages: options.limit,
          outputFormats: [options.format],
        },
      }, { timeout: 1800000 });

      spin.stop();

      const data = res.data?.data || res.data;
      const output = JSON.stringify(data, null, options.pretty ? 2 : 0);

      if (options.output) {
        saveOutput(options.output, output);
      } else {
        if (options.json || !options.pretty) {
          console.log(output);
        } else {
          printJSON(data, true);
        }
      }
    } catch {
      spin.fail(`Failed to crawl ${url}`);
      process.exit(1);
    }
  });

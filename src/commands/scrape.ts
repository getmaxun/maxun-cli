import { Command } from 'commander';
import chalk from 'chalk';
import { getClient } from '../lib/api';
import { spinner, saveOutput, printJSON } from '../lib/output';

export const scrapeCommand = new Command('scrape')
  .description('Scrape a URL and extract its content')
  .argument('<url>', 'URL to scrape')
  .option('-f, --format <fmt>', 'Output format: markdown, html, text, json (comma-separated for multiple)', 'markdown')
  .option('-o, --output <file>', 'Save output to file')
  .option('--screenshot', 'Include a screenshot')
  .option('--only-main-content', 'Strip navigation, footers and ads (default: true)', true)
  .option('--wait-for <ms>', 'Wait N milliseconds before scraping', parseInt)
  .option('--pretty', 'Pretty print JSON output')
  .option('--json', 'Force raw JSON output (pipe-friendly)')
  .action(async (url: string, options) => {
    const formats = options.format.split(',').map((f: string) => f.trim());
    if (options.screenshot) formats.push('screenshot');

    const spin = spinner(`Scraping ${chalk.cyan(url)}...`);
    const client = getClient();

    try {
      const res = await client.post('/api/sdk/scrape', {
        url,
        formats,
        onlyMainContent: options.onlyMainContent,
        ...(options.waitFor ? { waitFor: options.waitFor } : {}),
      }, { timeout: 1800000 });

      spin.stop();

      const data = res.data;

      if (options.json) {
        printJSON(data, options.pretty);
        return;
      }

      // Single format — output directly to stdout
      if (formats.length === 1 && !options.screenshot) {
        const fmt = formats[0];
        const content = data?.data?.[fmt] || data?.[fmt] || data?.markdown || data?.content || '';
        if (options.output) {
          saveOutput(options.output, content);
        } else {
          process.stdout.write(content);
          if (!content.endsWith('\n')) process.stdout.write('\n');
        }
      } else {
        // Multiple formats — output JSON
        const output = JSON.stringify(data, null, options.pretty ? 2 : 0);
        if (options.output) {
          saveOutput(options.output, output);
        } else {
          console.log(output);
        }
      }
    } catch {
      spin.fail(`Failed to scrape ${url}`);
      process.exit(1);
    }
  });

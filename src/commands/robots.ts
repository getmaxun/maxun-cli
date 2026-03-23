import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs';
import { getClient } from '../lib/api';
import { spinner, printTable, shortId, formatDate, statusBadge, saveOutput, success, error, printJSON } from '../lib/output';

export const robotsCommand = new Command('robots')
  .description('Manage your Maxun robots');

// maxun robots list
robotsCommand
  .command('list')
  .description('List all robots')
  .option('--json', 'Output raw JSON')
  .action(async (options) => {
    const spin = spinner('Fetching robots...');
    const client = getClient();

    try {
      const res = await client.get('/api/sdk/robots');
      spin.stop();

      const robots: any[] = res.data?.data || res.data?.robots || res.data || [];

      if (options.json) {
        printJSON(robots);
        return;
      }

      if (robots.length === 0) {
        console.log(chalk.gray('No robots found. Create one with: maxun robots create-scrape <url>'));
        return;
      }

      printTable(
        ['ID', 'Name', 'Type'],
        robots.map((r: any) => [
          chalk.gray(r.recording_meta?.id || r.id || ''),
          chalk.white(r.recording_meta?.name || r.name || '—'),
          chalk.cyan(r.recording_meta?.robotType || r.robotType || 'extract')
        ])
      );
      console.log(chalk.gray(`\n  ${robots.length} robot${robots.length !== 1 ? 's' : ''} total`));
    } catch {
      spin.fail('Failed to fetch robots');
      process.exit(1);
    }
  });

// maxun robots scrape <url>
robotsCommand
  .command('scrape <url>')
  .description('Create a scrape robot for a URL')
  .option('-n, --name <name>', 'Robot name')
  .option('-f, --format <fmt>', 'Formats: markdown, html, text, screenshot-visible, screenshot-fullpage (comma-separated)', 'markdown')
  .action(async (url, options) => {
    const formats = options.format.split(',').map((f: string) => f.trim());
    const name = options.name || `Scrape Robot - ${new URL(url).hostname}`;
    const spin = spinner(`Creating scrape robot for ${chalk.cyan(url)}...`);
    const client = getClient();

    try {
      const res = await client.post('/api/sdk/robots', {
        meta: {
          name,
          robotType: 'scrape',
          url,
          formats
        },
        workflow: []
      });
      spin.stop();
      const robot = res.data?.data || res.data;
      const robotId = robot.recording_meta?.id || robot.id;
      success(`Scrape robot created: ${chalk.bold(name)} (${chalk.cyan(robotId)})`);
      console.log(chalk.gray(`  Run it: maxun run ${robotId}`));
    } catch {
      spin.fail('Failed to create scrape robot');
      process.exit(1);
    }
  });

// maxun robots crawl <url>
robotsCommand
  .command('crawl <url>')
  .description('Create a crawl robot for a URL')
  .option('-n, --name <name>', 'Robot name')
  .option('-f, --format <fmt>', 'Formats: markdown, html, text, screenshot-visible, screenshot-fullpage (comma-separated)', 'markdown')
  .option('--limit <n>', 'Max pages to crawl', parseInt, 10)
  .option('--include <paths>', 'Include path patterns (comma-separated)')
  .option('--exclude <paths>', 'Exclude path patterns (comma-separated)')
  .action(async (url, options) => {
    const name = options.name || `Crawl Robot - ${new URL(url).hostname}`;
    const formats = options.format.split(',').map((f: string) => f.trim());
    const spin = spinner(`Creating crawl robot for ${chalk.cyan(url)}...`);
    const client = getClient();

    try {
      const res = await client.post('/api/sdk/crawl', {
        url,
        name,
        crawlConfig: {
          limit: options.limit,
          outputFormats: formats,
          includePaths: options.include ? options.include.split(',').map((p: string) => p.trim()) : [],
          excludePaths: options.exclude ? options.exclude.split(',').map((p: string) => p.trim()) : []
        }
      });
      spin.stop();
      const robot = res.data?.data || res.data;
      const robotId = robot.recording_meta?.id || robot.id;
      success(`Crawl robot created: ${chalk.bold(name)} (${chalk.cyan(robotId)})`);
      console.log(chalk.gray(`  Run it: maxun run ${robotId}`));
    } catch {
      spin.fail('Failed to create crawl robot');
      process.exit(1);
    }
  });

// maxun robots search <query>
robotsCommand
  .command('search <query>')
  .description('Create a search robot for a query')
  .option('-n, --name <name>', 'Robot name')
  .option('-f, --format <fmt>', 'Formats: markdown, html, text, screenshot-visible, screenshot-fullpage (comma-separated)')
  .option('--limit <n>', 'Max search results', parseInt, 10)
  .option('--mode <mode>', 'Search mode: discover, scrape', 'discover')
  .action(async (query, options) => {
    const name = options.name || `Search Robot - ${query}`;
    const formats = options.format ? options.format.split(',').map((f: string) => f.trim()) : [];
    const spin = spinner(`Creating search robot for "${chalk.cyan(query)}"...`);
    const client = getClient();

    try {
      const res = await client.post('/api/sdk/search', {
        name,
        searchConfig: {
          query,
          limit: options.limit,
          mode: options.mode,
          outputFormats: formats
        }
      });
      spin.stop();
      const robot = res.data?.data || res.data;
      const robotId = robot.recording_meta?.id || robot.id;
      success(`Search robot created: ${chalk.bold(name)} (${chalk.cyan(robotId)})`);
      console.log(chalk.gray(`  Run it: maxun run ${robotId}`));
    } catch {
      spin.fail('Failed to create search robot');
      process.exit(1);
    }
  });

// maxun robots run <id>
robotsCommand
  .command('run <id>')
  .description('Trigger a robot run')
  .action(async (id) => {
    const spin = spinner(`Starting robot ${chalk.cyan(id)}...`);
    const client = getClient();

    try {
      const res = await client.post(`/api/sdk/robots/${id}/execute`, {}, { timeout: 1800000 });
      spin.stop();
      
      const response = res.data?.data || res.data;
      const runId = response?.runId || res.data?.runId || res.data?.id;
      const status = response?.status || 'unknown';
      const extracted = response?.data || {};

      success(`Run completed: ${chalk.bold(runId)} ${statusBadge(status)}`);

      if (status === 'success' || status === 'completed') {
        console.log(chalk.bold.cyan('\nExtracted Data:'));
        
        if (extracted.textData && Object.keys(extracted.textData).length > 0) {
          console.log(chalk.yellow('\n[Text Data]'));
          console.log(JSON.stringify(extracted.textData, null, 2));
        }

        if (extracted.listData && extracted.listData.length > 0) {
          console.log(chalk.yellow(`\n[List Data] (${extracted.listData.length} records)`));
          console.log(JSON.stringify(extracted.listData, null, 2));
        }

        if (extracted.crawlData && extracted.crawlData.length > 0) {
          console.log(chalk.yellow(`\n[Crawl Data] (${extracted.crawlData.length} pages)`));
          console.log(JSON.stringify(extracted.crawlData, null, 2));
        }

        if (extracted.markdown) {
          console.log(chalk.yellow('\n[Markdown Content]'));
          console.log(extracted.markdown);
        }

        console.log(chalk.gray(`\n  Results are stored. To export as CSV or another format, use: maxun runs get ${id} ${runId}`));
      }
    } catch {
      spin.fail('Failed to run robot');
      process.exit(1);
    }
  });

// maxun robots get <id>
robotsCommand
  .command('get <id>')
  .description('Get robot details')
  .option('--json', 'Output raw JSON')
  .action(async (id, options) => {
    const spin = spinner(`Fetching robot ${chalk.cyan(id)}...`);
    const client = getClient();

    try {
      const res = await client.get(`/api/sdk/robots/${id}`);
      spin.stop();
      const robot = res.data?.data || res.data;
      
      if (options.json) {
        printJSON(robot);
        return;
      }

      console.log(chalk.bold(`\n🤖 Robot: ${robot.recording_meta?.name || 'Unnamed'}\n`));
      console.log(chalk.gray(`  ID:       `) + chalk.white(robot.recording_meta?.id || robot.id));
      console.log(chalk.gray(`  Type:     `) + chalk.cyan(robot.recording_meta?.robotType || 'extract'));
      console.log(chalk.gray(`  URL:      `) + chalk.blue(robot.recording_meta?.url || '—'));
      console.log(chalk.gray(`  Created:  `) + chalk.white(formatDate(robot.recording_meta?.createdAt || '')));
      console.log();
    } catch {
      spin.fail('Failed to fetch robot');
      process.exit(1);
    }
  });

// maxun robots delete <id>
robotsCommand
  .command('delete <id>')
  .description('Delete a robot')
  .action(async (id) => {
    const spin = spinner(`Deleting robot ${chalk.cyan(id)}...`);
    const client = getClient();

    try {
      await client.delete(`/api/sdk/robots/${id}`);
      spin.succeed(`Robot deleted successfully`);
    } catch {
      spin.fail('Failed to delete robot');
      process.exit(1);
    }
  });

// maxun robots duplicate <id> --url <new-url>
robotsCommand
  .command('duplicate <id>')
  .description('Duplicate a robot with a new URL')
  .requiredOption('--url <url>', 'New target URL')
  .action(async (id, options) => {
    const spin = spinner(`Duplicating robot ${chalk.cyan(id)} with new URL...`);
    const client = getClient();

    try {
      const res = await client.post(`/api/sdk/robots/${id}/duplicate`, {
        targetUrl: options.url
      });
      spin.stop();
      const robot = res.data?.data || res.data;
      const newId = robot.recording_meta?.id || robot.id;
      success(`Robot duplicated: ${chalk.bold(robot.recording_meta?.name)} (${chalk.cyan(newId)})`);
    } catch {
      spin.fail('Failed to duplicate robot');
      process.exit(1);
    }
  });

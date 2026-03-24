import { Command } from 'commander';
import chalk from 'chalk';
import { getClient } from '../lib/api';
import { spinner, printTable, shortId, formatDate, statusBadge, saveOutput, success, error, printJSON } from '../lib/output';

export const robotsCommand = new Command('robots')
  .description('Manage your Maxun robots');

robotsCommand
  .command('list')
  .description('List all robots')
  .option('-t, --table', 'Output in table format')
  .action(async (options) => {
    const spin = spinner('Fetching robots...');
    const client = getClient();

    try {
      const res = await client.get('/api/sdk/robots');
      spin.stop();

      const robots: any[] = res.data?.data || res.data?.robots || res.data || [];
      const simplifiedRobots = robots.map((r: any) => ({
        id: r.recording_meta?.id || r.id || '',
        name: r.recording_meta?.name || r.name || '—',
        robotType: r.recording_meta?.robotType || r.recording_meta?.type || r.robotType || r.type || 'extract',
        url: r.recording_meta?.url || r.url || '—',
        createdAt: r.recording_meta?.createdAt || r.createdAt || '—'
      }));

      if (options.table) {
        if (simplifiedRobots.length === 0) {
          console.log(chalk.gray('No robots found.'));
          return;
        }

        printTable(
          ['ID', 'Name', 'Type', 'URL', 'Created'],
          simplifiedRobots.map((r: any) => [
            chalk.gray(r.id),
            chalk.white(r.name),
            chalk.cyan(r.robotType),
            chalk.gray(r.url.length > 30 ? r.url.substring(0, 27) + '...' : r.url),
            formatDate(r.createdAt)
          ])
        );
        console.log(chalk.gray(`\n  ${simplifiedRobots.length} robot${simplifiedRobots.length !== 1 ? 's' : ''} total`));
      } else {
        printJSON(simplifiedRobots);
      }
    } catch {
      spin.fail('Failed to fetch robots');
      process.exit(1);
    }
  });

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

robotsCommand
  .command('crawl <url>')
  .description('Create a crawl robot for a URL')
  .option('-n, --name <name>', 'Robot name')
  .option('-f, --format <fmt>', 'Formats: markdown, html, text, screenshot-visible, screenshot-fullpage (comma-separated)', 'markdown')
  .option('--limit <n>', 'Max pages to crawl', parseInt, 10)
  .option('--max-depth <n>', 'Max depth to crawl', parseInt, 3)
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
          maxDepth: options.maxDepth || 10,
          outputFormats: formats,
          followLinks: true,
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

robotsCommand
  .command('extract')
  .description('Create an AI-powered extraction robot using a prompt')
  .requiredOption('-p, --prompt <prompt>', 'Natural language prompt for extraction')
  .option('-u, --url <url>', 'Target URL (optional, if omitted it will search for the URL)')
  .option('-n, --name <name>', 'Robot name')
  .option('--provider <provider>', 'LLM Provider: huggingface, openrouter', 'huggingface')
  .option('--model <model>', 'LLM Model name')
  .option('--api-key <key>', 'LLM API Key')
  .action(async (options) => {
    const spin = spinner('Generating AI robot from prompt...');
    const client = getClient();

    try {
      const res = await client.post('/api/sdk/extract/llm', {
        url: options.url,
        prompt: options.prompt,
        llmProvider: options.provider,
        llmModel: options.model,
        llmApiKey: options.apiKey,
        robotName: options.name
      }, { timeout: 300000 });
      
      spin.stop();
      const robot = res.data?.data || res.data;
      const robotId = robot.robotId || robot.recording_meta?.id || robot.id;
      const name = robot.name || robot.recording_meta?.name || options.name || 'AI Robot';

      success(`AI Extract robot created: ${chalk.bold(name)} (${chalk.cyan(robotId)})`);
      if (res.data?.existing) {
        console.log(chalk.yellow('  (Using existing robot with same configuration)'));
      }
      console.log(chalk.gray(`  Run it: maxun run ${robotId}`));
    } catch (e: any) {
      spin.fail('Failed to generate AI robot');
      if (e.response?.data?.error) {
        error(e.response.data.error);
        if (e.response.data.details) {
          console.log(chalk.gray('Details:'), e.response.data.details);
        }
      }
      process.exit(1);
    }
  });

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

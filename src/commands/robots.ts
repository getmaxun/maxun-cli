import { Command } from 'commander';
import chalk from 'chalk';
import { getClient } from '../lib/api';
import * as fs from 'fs';
import * as path from 'path';
import FormData from 'form-data';
import { spinner, printTable, formatDate, success, error, printJSON } from '../lib/output';

/**
 * Serialises LLM options, omitting anything not explicitly passed.
 *
 * Self-hosted Maxun requires these whenever a request needs a model — the
 * `summary` format, Smart Queries, LLM extract and document extract. Maxun
 * Cloud manages its own and rejects them, so an unset flag must not appear in
 * the payload at all.
 */
function buildLlmPayload(options: any): Record<string, string> {
  const provider = options.llmProvider?.trim();
  const model = options.llmModel?.trim();
  const apiKey = options.llmApiKey?.trim();
  const baseUrl = options.llmBaseUrl?.trim();

  /**
   * All-or-nothing. Pass no LLM flags to use the platform's own models (the
   * only thing Maxun Cloud accepts), or a complete set for a self-hosted
   * instance. Checked here so the message names the missing flag rather than
   * surfacing as a server 400.
   */
  if (model && !provider) {
    error('--llm-provider is required when --llm-model is set.');
    process.exit(1);
  }
  if (provider && provider !== 'ollama' && !apiKey) {
    error(`--llm-api-key is required for provider "${provider}".`);
    process.exit(1);
  }

  return {
    ...(provider ? { llmProvider: provider } : {}),
    ...(model ? { llmModel: model } : {}),
    ...(apiKey ? { llmApiKey: apiKey } : {}),
    ...(baseUrl ? { llmBaseUrl: baseUrl } : {}),
  };
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

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
  .option('-f, --format <fmt>', 'Formats: markdown, html, text, links, summary, screenshot-visible, screenshot-fullpage (comma-separated)', 'markdown')
  .option('-p, --prompt <text>', 'Smart Queries: LLM prompt to analyze the page after scraping (+2 credits per run)')
  .option('--llm-provider <provider>', 'LLM provider (self-hosted Maxun only): anthropic, openai, ollama')
  .option('--llm-model <model>', 'LLM model name (self-hosted Maxun only)')
  .option('--llm-api-key <key>', 'LLM API key (self-hosted Maxun only)')
  .option('--llm-base-url <url>', 'LLM base URL (self-hosted Maxun only)')
  .action(async (url, options) => {
    const formats = options.format.split(',').map((f: string) => f.trim());
    const name = options.name || `Scrape Robot - ${safeHostname(url)}`;
    const spin = spinner(`Creating scrape robot for ${chalk.cyan(url)}...`);
    const client = getClient();

    try {
      const meta: any = {
        name,
        robotType: 'scrape',
        url,
        formats
      };
      if (options.prompt) {
        meta.promptInstructions = options.prompt.trim();
      }
      Object.assign(meta, buildLlmPayload(options));

      const res = await client.post('/api/sdk/robots', {
        meta,
        workflow: []
      });
      spin.stop();
      const robot = res.data?.data || res.data;
      const robotId = robot.recording_meta?.id || robot.id;
      success(`Scrape robot created: ${chalk.bold(name)} (${chalk.cyan(robotId)})`);
      if (options.prompt) {
        console.log(chalk.yellow(`  Smart Queries enabled — costs 3 credits per run (1 base + 2 for prompt)`));
      }
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
  .option('-f, --format <fmt>', 'Formats: markdown, html, text, links, summary, screenshot-visible, screenshot-fullpage (comma-separated)', 'markdown')
  .option('--limit <n>', 'Max pages to crawl', parseInt, 10)
  .option('--max-depth <n>', 'Max depth to crawl', parseInt, 3)
  .option('--include <paths>', 'Include path patterns (comma-separated)')
  .option('--exclude <paths>', 'Exclude path patterns (comma-separated)')
  .option('--llm-provider <provider>', 'LLM provider (self-hosted Maxun only): anthropic, openai, ollama')
  .option('--llm-model <model>', 'LLM model name (self-hosted Maxun only)')
  .option('--llm-api-key <key>', 'LLM API key (self-hosted Maxun only)')
  .option('--llm-base-url <url>', 'LLM base URL (self-hosted Maxun only)')
  .action(async (url, options) => {
    const name = options.name || `Crawl Robot - ${safeHostname(url)}`;
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
        },
        ...buildLlmPayload(options)
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
  .option('-f, --format <fmt>', 'Formats: markdown, html, text, links, summary, screenshot-visible, screenshot-fullpage (comma-separated)')
  .option('--limit <n>', 'Max search results', parseInt, 10)
  .option('--mode <mode>', 'Search mode: discover, scrape', 'discover')
  .option('--llm-provider <provider>', 'LLM provider (self-hosted Maxun only): anthropic, openai, ollama')
  .option('--llm-model <model>', 'LLM model name (self-hosted Maxun only)')
  .option('--llm-api-key <key>', 'LLM API key (self-hosted Maxun only)')
  .option('--llm-base-url <url>', 'LLM base URL (self-hosted Maxun only)')
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
        },
        ...buildLlmPayload(options)
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
  .option('--llm-provider <provider>', 'LLM provider (self-hosted Maxun only): anthropic, openai, ollama')
  .option('--llm-model <model>', 'LLM model name (self-hosted Maxun only)')
  .option('--llm-api-key <key>', 'LLM API key (self-hosted Maxun only)')
  .option('--llm-base-url <url>', 'LLM base URL (self-hosted Maxun only)')
  .action(async (options) => {
    const spin = spinner('Generating AI robot from prompt...');
    const client = getClient();

    try {
      /**
       * LLM options are only sent when explicitly supplied. Self-hosted Maxun
       * honours them; Maxun Cloud manages the provider, model and credentials
       * itself and rejects them, so sending a default would break every Cloud
       * user of this command.
       */
      const res = await client.post('/api/sdk/extract/llm', {
        url: options.url,
        prompt: options.prompt,
        ...buildLlmPayload(options),
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
  .command('doc-extract <pdf>')
  .description('Create a document-extract robot from a local PDF file')
  .requiredOption('-p, --prompt <prompt>', 'What to extract (e.g. "invoice number, vendor, total")')
  .option('-n, --name <name>', 'Robot name')
  .option('--llm-provider <provider>', 'LLM provider (self-hosted Maxun only): anthropic, openai, ollama')
  .option('--llm-model <model>', 'LLM model name (self-hosted Maxun only)')
  .option('--llm-api-key <key>', 'LLM API key (self-hosted Maxun only)')
  .option('--llm-base-url <url>', 'LLM base URL (self-hosted Maxun only)')
  .action(async (pdfPath, options) => {
    const resolved = path.resolve(pdfPath);
    if (!fs.existsSync(resolved)) {
      console.error(chalk.red(`File not found: ${resolved}`));
      process.exit(1);
    }

    const spin = spinner(`Creating doc-extract robot from ${chalk.cyan(path.basename(resolved))}...`);
    const client = getClient();

    try {
      const form = new FormData();
      form.append('file', fs.createReadStream(resolved), path.basename(resolved));
      form.append('prompt', options.prompt);
      if (options.name) form.append('robotName', options.name);
      Object.entries(buildLlmPayload(options)).forEach(([key, value]) => form.append(key, value));

      const res = await client.post('/api/sdk/robots/document', form, {
        headers: form.getHeaders(),
        timeout: 120000,
      });
      spin.stop();

      const robot = res.data?.data || res.data?.robot || res.data;
      const robotId = res.data?.robotId || robot?.recording_meta?.id || robot?.id;
      const name = robot?.recording_meta?.name || options.name || 'Document Robot';

      success(`doc-extract robot created: ${chalk.bold(name)} (${chalk.cyan(robotId)})`);
      console.log(chalk.gray(`  Run it: maxun run ${robotId}`));
    } catch (e: any) {
      const serverMsg = e.response?.data?.error || e.response?.data?.message;
      const status = e.response?.status;
      spin.fail(`Failed to create doc-extract robot${status ? ` (HTTP ${status})` : ''}`);
      if (serverMsg) error(serverMsg);
      else error(e.message);
      process.exit(1);
    }
  });

robotsCommand
  .command('doc-parse <pdf>')
  .description('Create a document-parse robot from a local PDF file')
  .requiredOption('-f, --formats <formats>', 'Output formats, comma-separated (markdown,html,links)')
  .option('-n, --name <name>', 'Robot name')
  .action(async (pdfPath, options) => {
    const resolved = path.resolve(pdfPath);
    if (!fs.existsSync(resolved)) {
      console.error(chalk.red(`File not found: ${resolved}`));
      process.exit(1);
    }

    const formats = options.formats.split(',').map((f: string) => f.trim()).filter(Boolean);
    const validFormats = ['markdown', 'html', 'links'];
    const invalid = formats.filter((f: string) => !validFormats.includes(f));
    if (invalid.length > 0) {
      console.error(chalk.red(`Invalid formats: ${invalid.join(', ')}. Valid options: ${validFormats.join(', ')}`));
      process.exit(1);
    }

    const spin = spinner(`Creating doc-parse robot from ${chalk.cyan(path.basename(resolved))}...`);
    const client = getClient();

    try {
      const form = new FormData();
      form.append('file', fs.createReadStream(resolved), path.basename(resolved));
      if (options.name) form.append('robotName', options.name);
      formats.forEach((f: string) => form.append('outputFormats[]', f));

      const res = await client.post('/api/sdk/robots/document-parse', form, {
        headers: form.getHeaders(),
        timeout: 120000,
      });
      spin.stop();

      const robot = res.data?.data || res.data?.robot || res.data;
      const robotId = res.data?.robotId || robot?.recording_meta?.id || robot?.id;
      const name = robot?.recording_meta?.name || options.name || 'Document Parse Robot';

      success(`doc-parse robot created: ${chalk.bold(name)} (${chalk.cyan(robotId)})`);
      console.log(chalk.gray(`  Formats:  `) + chalk.cyan(formats.join(', ')));
      console.log(chalk.gray(`  Run it:   maxun run ${robotId}`));
    } catch (e: any) {
      const serverMsg = e.response?.data?.error || e.response?.data?.message;
      const status = e.response?.status;
      spin.fail(`Failed to create doc-parse robot${status ? ` (HTTP ${status})` : ''}`);
      if (serverMsg) error(serverMsg);
      else error(e.message);
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
      console.log(chalk.gray(`  Type:     `) + chalk.cyan(robot.recording_meta?.type || robot.recording_meta?.robotType || 'extract'));
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

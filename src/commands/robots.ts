import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs';
import { getClient } from '../lib/api';
import { spinner, printTable, shortId, formatDate, statusBadge, saveOutput, success, error } from '../lib/output';

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

      const robots: any[] = res.data?.robots || res.data || [];

      if (options.json) {
        console.log(JSON.stringify(robots, null, 2));
        return;
      }

      if (robots.length === 0) {
        console.log(chalk.gray('No robots found. Create one at https://app.maxun.dev'));
        return;
      }

      printTable(
        ['ID', 'Name', 'Type', 'Last Run', 'Status'],
        robots.map((r: any) => [
          chalk.gray(shortId(r.id || r.recording_meta?.id || '')),
          chalk.white(r.recording_meta?.name || r.name || '—'),
          chalk.cyan(r.recording_meta?.robotType || r.robotType || 'extract'),
          formatDate(r.recording_meta?.lastRunAt || r.lastRunAt || ''),
          statusBadge(r.status || ''),
        ])
      );
      console.log(chalk.gray(`\n  ${robots.length} robot${robots.length !== 1 ? 's' : ''} total`));
    } catch {
      spin.fail('Failed to fetch robots');
      process.exit(1);
    }
  });

// maxun robots run <id>
robotsCommand
  .command('run <id>')
  .description('Trigger a robot run')
  .option('--watch', 'Stream run status updates until complete')
  .option('--wait', 'Block until complete, exit 1 on failure (CI/CD mode)')
  .option('--json', 'Output raw JSON')
  .action(async (id: string, options) => {
    const spin = spinner(`Starting robot ${chalk.cyan(shortId(id))}...`);
    const client = getClient();

    try {
      const res = await client.post(`/api/sdk/robots/${id}/run`);
      const runId = res.data?.runId || res.data?.id;
      spin.succeed(`Run started: ${chalk.bold(shortId(runId))}`);

      if (!options.watch && !options.wait) {
        console.log(chalk.gray(`  Track it: maxun runs get ${runId}`));
        return;
      }

      // Watch/wait: poll until done
      const pollSpin = spinner('Waiting for run to complete...');
      let done = false;
      let lastStatus = '';

      while (!done) {
        await new Promise((r) => setTimeout(r, 3000));
        try {
          const statusRes = await client.get(`/api/sdk/runs/${runId}`);
          const status = statusRes.data?.status || statusRes.data?.run?.status || 'unknown';

          if (status !== lastStatus) {
            pollSpin.text = `Status: ${statusBadge(status)}`;
            lastStatus = status;
          }

          if (['success', 'completed', 'failed', 'error'].includes(status.toLowerCase())) {
            done = true;
            if (['failed', 'error'].includes(status.toLowerCase())) {
              pollSpin.fail(`Run failed`);
              process.exit(1);
            } else {
              pollSpin.succeed(`Run completed successfully`);
              if (options.json) {
                console.log(JSON.stringify(statusRes.data, null, 2));
              } else {
                console.log(chalk.gray(`  Get results: maxun runs get ${runId}`));
              }
            }
          }
        } catch {
          // ignore transient poll errors
        }
      }
    } catch {
      spin.fail('Failed to start robot run');
      process.exit(1);
    }
  });

// maxun robots export <id>
robotsCommand
  .command('export <id>')
  .description('Export robot configuration as JSON')
  .option('-o, --output <file>', 'Save to file instead of stdout')
  .action(async (id: string, options) => {
    const spin = spinner(`Exporting robot ${chalk.cyan(shortId(id))}...`);
    const client = getClient();

    try {
      const res = await client.get(`/api/sdk/robots/${id}`);
      spin.stop();

      const json = JSON.stringify(res.data, null, 2);
      if (options.output) {
        saveOutput(options.output, json);
      } else {
        console.log(json);
      }
    } catch {
      spin.fail('Failed to export robot');
      process.exit(1);
    }
  });

// maxun robots import <file>
robotsCommand
  .command('import <file>')
  .description('Import a robot from a JSON file')
  .action(async (file: string) => {
    if (!fs.existsSync(file)) {
      error(`File not found: ${file}`);
      process.exit(1);
    }

    let workflow: any;
    try {
      workflow = JSON.parse(fs.readFileSync(file, 'utf-8'));
    } catch {
      error('Invalid JSON file');
      process.exit(1);
    }

    const spin = spinner(`Importing robot from ${chalk.cyan(file)}...`);
    const client = getClient();

    try {
      const res = await client.post('/api/sdk/robots', workflow);
      spin.stop();
      success(`Robot imported: ${chalk.bold(res.data?.name || res.data?.id || 'done')}`);
    } catch {
      spin.fail('Failed to import robot');
      process.exit(1);
    }
  });

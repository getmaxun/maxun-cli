import { Command } from 'commander';
import chalk from 'chalk';
import { getClient } from '../lib/api';
import { spinner, printTable, shortId, formatDate, formatDuration, statusBadge, saveOutput } from '../lib/output';

export const runsCommand = new Command('runs')
  .description('Manage robot runs');

// maxun runs list
runsCommand
  .command('list')
  .description('List recent runs')
  .option('--robot <id>', 'Filter by robot ID')
  .option('--limit <n>', 'Max results', parseInt, 10)
  .option('--json', 'Output raw JSON')
  .action(async (options) => {
    const spin = spinner('Fetching runs...');
    const client = getClient();

    try {
      const params: any = { limit: options.limit };
      if (options.robot) params.robotId = options.robot;

      const res = await client.get('/api/sdk/runs', { params });
      spin.stop();

      const runs: any[] = res.data?.runs || res.data || [];

      if (options.json) {
        console.log(JSON.stringify(runs, null, 2));
        return;
      }

      if (runs.length === 0) {
        console.log(chalk.gray('No runs found.'));
        return;
      }

      printTable(
        ['Run ID', 'Robot', 'Status', 'Started', 'Duration'],
        runs.map((r: any) => [
          chalk.gray(shortId(r.id || r.runId || '')),
          chalk.white(r.robotName || r.recording_meta?.name || shortId(r.robotId || '')),
          statusBadge(r.status),
          formatDate(r.createdAt || r.startedAt || ''),
          formatDuration(r.createdAt || r.startedAt || '', r.finishedAt || r.completedAt),
        ])
      );
      console.log(chalk.gray(`\n  ${runs.length} run${runs.length !== 1 ? 's' : ''}`));
    } catch {
      spin.fail('Failed to fetch runs');
      process.exit(1);
    }
  });

// maxun runs get <id>
runsCommand
  .command('get <id>')
  .description('Get the output of a run')
  .option('-f, --format <fmt>', 'Output format: json, csv, table', 'json')
  .option('-o, --output <file>', 'Save output to file')
  .option('--pretty', 'Pretty print JSON')
  .action(async (id: string, options) => {
    const spin = spinner(`Fetching run ${chalk.cyan(shortId(id))}...`);
    const client = getClient();

    try {
      const res = await client.get(`/api/sdk/runs/${id}`);
      spin.stop();

      const run = res.data;
      const outputData = run?.serializableOutput || run?.output || run;

      if (options.format === 'csv') {
        const csvContent = toCSV(outputData);
        if (options.output) {
          saveOutput(options.output, csvContent);
        } else {
          process.stdout.write(csvContent);
        }
      } else {
        const json = JSON.stringify(options.pretty || options.output ? run : outputData, null, options.pretty ? 2 : 0);
        if (options.output) {
          saveOutput(options.output, json);
        } else {
          console.log(json);
        }
      }
    } catch {
      spin.fail('Failed to fetch run');
      process.exit(1);
    }
  });

function toCSV(data: any): string {
  try {
    let rows: Record<string, unknown>[] = [];
    if (Array.isArray(data)) {
      rows = data.flat().filter((r) => typeof r === 'object');
    } else if (typeof data === 'object') {
      for (const key of Object.keys(data)) {
        const val = data[key];
        if (Array.isArray(val)) {
          rows = rows.concat(val.flat().filter((r) => typeof r === 'object'));
        }
      }
    }
    if (rows.length === 0) return JSON.stringify(data);
    const headers = Object.keys(rows[0]);
    const lines = [headers.join(',')];
    for (const row of rows) {
      lines.push(headers.map((h) => JSON.stringify((row as any)[h] ?? '')).join(','));
    }
    return lines.join('\n') + '\n';
  } catch {
    return JSON.stringify(data);
  }
}

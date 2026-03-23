import { Command } from 'commander';
import chalk from 'chalk';
import { getClient } from '../lib/api';
import { spinner, printTable, printDataTable, shortId, formatDate, formatDuration, statusBadge, saveOutput, printJSON } from '../lib/output';

export const runsCommand = new Command('runs')
  .description('Manage robot runs (scoped to a robot)');

// maxun runs list <robot-id>
runsCommand
  .command('list <robot-id>')
  .description('List recent runs for a specific robot')
  .option('--limit <n>', 'Max results', parseInt, 10)
  .option('-t, --table', 'Output in table format')
  .action(async (robotId, options) => {
    const spin = spinner(`Fetching runs for robot ${chalk.cyan(robotId)}...`);
    const client = getClient();

    try {
      const res = await client.get(`/api/sdk/robots/${robotId}/runs`);
      spin.stop();

      const runs: any[] = res.data?.data || res.data?.runs || res.data || [];

      if (options.table) {
        if (runs.length === 0) {
          console.log(chalk.gray('No runs found for this robot.'));
          return;
        }

        const limitedRuns = runs.slice(0, options.limit);

        printTable(
          ['Run ID', 'Status', 'Started', 'Duration'],
          limitedRuns.map((r: any) => [
            chalk.gray(r.runId || r.id || ''),
            statusBadge(r.status),
            formatDate(r.startedAt || r.createdAt || ''),
            formatDuration(r.startedAt || r.createdAt || '', r.finishedAt || r.completedAt),
          ])
        );
        console.log(chalk.gray(`\n  ${limitedRuns.length} run${limitedRuns.length !== 1 ? 's' : ''} listed`));
      } else {
        printJSON(runs);
      }
    } catch {
      spin.fail('Failed to fetch runs');
      process.exit(1);
    }
  });

// maxun runs get <robot-id> <run-id>
runsCommand
  .command('get <robot-id> <run-id>')
  .description('Get the output and details of a specific run')
  .option('-f, --format <fmt>', 'Output format: json, csv, table', 'json')
  .option('-o, --output <file>', 'Save output to file')
  .option('--pretty', 'Pretty print JSON')
  .action(async (robotId, runId, options) => {
    const spin = spinner(`Fetching run ${chalk.cyan(runId)}...`);
    const client = getClient();

    try {
      const res = await client.get(`/api/sdk/robots/${robotId}/runs/${runId}`);
      spin.stop();

      const run = res.data?.data || res.data;
      const outputData = run?.serializableOutput || run?.output || run?.data || run;

      if (options.format === 'csv') {
        const csvContent = toCSV(outputData);
        if (options.output) {
          saveOutput(options.output, csvContent);
        } else {
          process.stdout.write(csvContent);
        }
      } else if (options.format === 'table') {
        const searchResults = outputData?.search && Object.values(outputData.search)[0] as any;
        if (searchResults && searchResults.mode === 'discover' && Array.isArray(searchResults.results)) {
          const normalized = searchResults.results.map((r: any) => ({
            title: r.title || '-',
            url: r.url || '-',
            description: r.description || '-'
          }));
          printDataTable(normalized);
        } else {
          // Fallback to JSON for non-discovery results even if table was requested
          printJSON(outputData);
        }
      } else {
        // Filter out empty fields for a cleaner JSON output
        const filteredOutput = outputData && typeof outputData === 'object' ? Object.entries(outputData).reduce((acc: any, [key, value]: [string, any]) => {
          const isEmptyArray = Array.isArray(value) && value.length === 0;
          const isEmptyObject = value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0;
          const isEmptyString = typeof value === 'string' && value.trim().length === 0;

          if (value !== null && value !== undefined && !isEmptyArray && !isEmptyObject && !isEmptyString) {
            acc[key] = value;
          }
          return acc;
        }, {}) : outputData;

        const json = JSON.stringify(options.pretty || options.output ? (run.data ? run : { ...run, data: filteredOutput }) : filteredOutput, null, options.pretty ? 2 : 0);
        if (options.output) {
          saveOutput(options.output, json);
        } else {
          console.log(json);
        }
      }
    } catch {
      spin.fail('Failed to fetch run details');
      process.exit(1);
    }
  });

// maxun runs abort <robot-id> <run-id>
runsCommand
  .command('abort <robot-id> <run-id>')
  .description('Abort a running robot execution')
  .action(async (robotId, runId) => {
    const spin = spinner(`Aborting run ${chalk.cyan(runId)}...`);
    const client = getClient();

    try {
      await client.post(`/api/sdk/robots/${robotId}/runs/${runId}/abort`);
      spin.succeed(`Abortion initiated for run ${chalk.bold(runId)}`);
    } catch {
      spin.fail('Failed to abort run');
      process.exit(1);
    }
  });

function toCSV(data: any): string {
  try {
    let rows: Record<string, unknown>[] = [];
    if (Array.isArray(data)) {
      rows = data.flat().filter((r) => typeof r === 'object');
    } else if (typeof data === 'object') {
      const values = Object.values(data);
      if (values.length > 0 && Array.isArray(values[0])) {
         rows = values[0].filter((r) => typeof r === 'object');
      } else {
        rows = [data];
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

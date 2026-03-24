import { Command } from 'commander';
import chalk from 'chalk';
import { getClient } from '../lib/api';
import { spinner, statusBadge, printDataTable, printJSON, success } from '../lib/output';

export const runCommand = new Command('run')
  .description('Run a Maxun robot by its ID')
  .argument('<id>', 'Robot ID to execute')
  .option('-f, --format <fmt>', 'Formats: markdown, html, text, screenshot-visible, screenshot-fullpage (comma-separated)')
  .option('-t, --table', 'Output results in table format')
  .action(async (id, options) => {
    const spin = spinner(`Running robot ${chalk.cyan(id)}...`);
    const client = getClient();

    try {
      const payload: any = {};
      const formats = options.format ? options.format.split(',').map((f: string) => f.trim()) : [];
      if (formats.length > 0) {
        payload.formats = formats;
      }

      const res = await client.post(`/api/sdk/robots/${id}/execute`, payload, { timeout: 1800000 });
      spin.stop();
      
      const response = res.data?.data || res.data;
      const runId = response?.runId || res.data?.runId || res.data?.id;
      const status = response?.status || 'unknown';
      const extracted = response?.data || {};
      
      success(`Run completed: ${chalk.bold(runId)} ${statusBadge(status)}`);

      if (status === 'success' || status === 'completed') {
        const searchKey = Object.keys(extracted.searchData || {})[0];
        const searchInfo = extracted.searchData ? extracted.searchData[searchKey] : null;
        const isDiscoverSearch = searchInfo && searchInfo.mode === 'discover';

        if (options.table && isDiscoverSearch) {
          console.log(chalk.bold.cyan('\nExtracted Data:'));
          if (Array.isArray(searchInfo.results)) {
            const normalized = searchInfo.results.map((r: any) => ({
              title: r.title || '-',
              url: r.url || '-',
              description: r.description || '-'
            }));
            printDataTable(normalized);
          }
        } else {
          const filteredResults = Object.entries(extracted).reduce((acc: any, [key, value]: [string, any]) => {
            const isEmptyArray = Array.isArray(value) && value.length === 0;
            const isEmptyObject = value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0;
            const isEmptyString = typeof value === 'string' && value.trim().length === 0;

            if (value !== null && value !== undefined && !isEmptyArray && !isEmptyObject && !isEmptyString) {
              acc[key] = value;
            }
            return acc;
          }, {});

          printJSON(filteredResults);
        }

        console.log(chalk.gray(`\n  Results are stored. To export as CSV or another format, use: maxun runs get ${id} ${runId}`));
      } else {
        console.error(chalk.red(`\nRun finished with status: ${status}`));
        if (response.error) console.error(chalk.red(`Error: ${response.error}`));
      }
    } catch (err: any) {
      spin.fail('Failed to start robot execution');
      if (err.response?.data?.error) console.error(chalk.red(`Error: ${err.response.data.error}`));
      process.exit(1);
    }
  });

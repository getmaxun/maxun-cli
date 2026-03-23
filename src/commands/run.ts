import { Command } from 'commander';
import chalk from 'chalk';
import { getClient } from '../lib/api';
import { spinner, shortId, success, statusBadge } from '../lib/output';

export const runCommand = new Command('run')
  .description('Run a Maxun robot by its ID')
  .argument('<id>', 'Robot ID to execute')
  .option('-f, --format <fmt>', 'Formats: markdown, html, text, screenshot-visible, screenshot-fullpage (comma-separated)')
  .action(async (id, options) => {
    const spin = spinner(`Triggering robot ${chalk.cyan(id)}...`);
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
        console.log(chalk.bold.cyan('\nExtracted Data:'));
        
        const hasTextData = extracted.textData && Object.keys(extracted.textData).length > 0;
        const hasTextContent = extracted.text && extracted.text.trim().length > 0;
        const hasListData = extracted.listData && extracted.listData.length > 0;
        const hasCrawlData = extracted.crawlData && extracted.crawlData.length > 0;
        const hasSearchData = extracted.searchData && Object.keys(extracted.searchData).length > 0;

        if (hasTextData) {
          console.log(chalk.yellow('\n[Text Data]'));
          console.log(JSON.stringify(extracted.textData, null, 2));
        }

        if (hasTextContent) {
          console.log(chalk.yellow('\n[Text Content]'));
          console.log(extracted.text);
        }

        if (hasListData) {
          console.log(chalk.yellow(`\n[List Data] (${extracted.listData.length} items)`));
          console.log(JSON.stringify(extracted.listData, null, 2));
        }

        if (hasCrawlData) {
          console.log(chalk.yellow(`\n[Crawl Data] (${extracted.crawlData.length} pages)`));
          console.log(JSON.stringify(extracted.crawlData, null, 2));
        }

        if (hasSearchData) {
          console.log(chalk.yellow('\n[Search Data]'));
          console.log(JSON.stringify(extracted.searchData, null, 2));
        }

        if (extracted.markdown) {
          console.log(chalk.yellow('\n[Markdown Content]'));
          console.log(extracted.markdown);
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

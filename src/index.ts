#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { loginCommand } from './commands/login';
import { logoutCommand } from './commands/logout';
import { statusCommand } from './commands/status';
import { scrapeCommand } from './commands/scrape';
import { crawlCommand } from './commands/crawl';
import { robotsCommand } from './commands/robots';
import { runsCommand } from './commands/runs';
import { creditsCommand } from './commands/credits';

const { version } = require('../package.json');

const program = new Command();

program
  .name('maxun')
  .description('Official CLI for Maxun — the open-source web data extraction platform')
  .version(version, '-v, --version')
  .addHelpText('after', `
${chalk.bold('Quick start:')}
  $ maxun login --api-key mx-your-key
  $ maxun https://example.com
  $ maxun robots list
  $ maxun robots run my-robot --watch

${chalk.bold('Docs:')} https://docs.maxun.dev/cli
`);

// ─── Subcommands ──────────────────────────────────────────────────────────────
program.addCommand(loginCommand);
program.addCommand(logoutCommand);
program.addCommand(statusCommand);
program.addCommand(scrapeCommand);
program.addCommand(crawlCommand);
program.addCommand(robotsCommand);
program.addCommand(runsCommand);
program.addCommand(creditsCommand);

// ─── URL-as-first-arg (like firecrawl but better) ─────────────────────────────
// maxun https://example.com [flags] — no subcommand needed
const isUrl = (str: string) => /^https?:\/\//i.test(str);

const args = process.argv.slice(2);
if (args.length > 0 && isUrl(args[0])) {
  // Inject 'scrape' before the URL so Commander routes it correctly
  process.argv.splice(2, 0, 'scrape');
}

program.parseAsync(process.argv).catch((err) => {
  console.error(chalk.red(`✗ ${err.message}`));
  process.exit(1);
});

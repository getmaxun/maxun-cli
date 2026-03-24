#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import * as dotenv from 'dotenv';

import { loginCommand } from './commands/login';
import { logoutCommand } from './commands/logout';
import { statusCommand } from './commands/status';
import { robotsCommand } from './commands/robots';
import { runsCommand } from './commands/runs';
import { runCommand } from './commands/run';
import { creditsCommand } from './commands/credits';

dotenv.config({ quiet: true });

const { version } = require('../package.json');

const program = new Command();

program
  .name('maxun')
  .description('Official CLI for Maxun — the open-source web data extraction platform')
  .version(version, '-v, --version')
  .addHelpText('after', `
${chalk.bold('Quick start:')}
  $ maxun login --api-key your-api-key
  $ maxun robots scrape https://example.com
  $ maxun robots list
  $ maxun run <robot-id>
  $ maxun runs get <robot-id> <run-id>

${chalk.bold('Docs:')} https://docs.maxun.dev/category/cli
`);

// ─── Subcommands ──────────────────────────────────────────────────────────────
program.addCommand(loginCommand);
program.addCommand(logoutCommand);
program.addCommand(statusCommand);
program.addCommand(robotsCommand);
program.addCommand(runsCommand);
program.addCommand(runCommand); // Top-level run
program.addCommand(creditsCommand);

// ─── Catch-all for robot creation without 'robots' prefix ─────────────────────
// This keeps the CLI usage similar to what users might expect
const args = process.argv.slice(2);
const subcommands = ['login', 'logout', 'status', 'robots', 'runs', 'run', 'credits', '-v', '--version', '-h', '--help'];

if (args.length > 0 && !subcommands.includes(args[0])) {
  const arg = args[0];
  if (/^https?:\/\//i.test(arg)) {
     // If first arg is a URL, assume they want 'robots scrape <url>'
     process.argv.splice(2, 0, 'robots', 'scrape');
  } else if (arg.length >= 8 && /^[a-f0-9-]+$/i.test(arg)) {
     // If it looks like a UUID, assume they want 'run <id>'
     process.argv.splice(2, 0, 'run');
  }
}

program.parseAsync(process.argv).catch((err) => {
  console.error(chalk.red(`✗ ${err.message}`));
  process.exit(1);
});

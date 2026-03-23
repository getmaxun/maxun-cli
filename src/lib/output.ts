import chalk from 'chalk';
import Table from 'cli-table3';
import ora, { Ora } from 'ora';
import fs from 'fs';

export function spinner(text: string): Ora {
  return ora({ text, stream: process.stderr }).start();
}

export function success(msg: string): void {
  console.log(chalk.green(`✓ ${msg}`));
}

export function error(msg: string): void {
  console.error(chalk.red(`✗ ${msg}`));
}

export function info(msg: string): void {
  console.error(chalk.gray(msg));
}

export function printTable(headers: string[], rows: string[][]): void {
  const table = new Table({
    head: headers.map((h) => chalk.bold.cyan(h)),
    style: { border: ['gray'], head: [] },
  });
  rows.forEach((row) => table.push(row));
  console.log(table.toString());
}

export function printJSON(data: unknown, pretty = false): void {
  if (pretty) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(JSON.stringify(data));
  }
}

export function saveOutput(filePath: string, content: string): void {
  fs.writeFileSync(filePath, content, 'utf-8');
  console.error(chalk.gray(`Saved to ${filePath}`));
}

export function shortId(id: string): string {
  return id.substring(0, 8);
}

export function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });
}

export function formatDuration(startIso: string, endIso?: string): string {
  if (!startIso) return '—';
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  const secs = Math.floor((end - start) / 1000);
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

export function statusBadge(status: string): string {
  switch (status?.toLowerCase()) {
    case 'success': case 'completed': return chalk.green('● success');
    case 'running': case 'in-progress': return chalk.blue('● running');
    case 'failed': case 'error': return chalk.red('● failed');
    case 'pending': case 'queued': return chalk.yellow('● pending');
    default: return chalk.gray(`● ${status || 'unknown'}`);
  }
}

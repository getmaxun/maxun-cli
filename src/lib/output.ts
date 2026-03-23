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

export function printDataTable(data: any): void {
  let rows: any[] = [];
  
  if (Array.isArray(data)) {
    rows = data;
  } else if (data && typeof data === 'object') {
    // Check if it's a wrapper object for list/crawl/search
    const values = Object.values(data);
    if (values.length > 0 && Array.isArray(values[0])) {
      rows = values[0];
    } else {
      rows = [data];
    }
  }

  if (rows.length === 0) {
    console.log(chalk.gray('No data to display in table.'));
    return;
  }

  // Extract all unique headers from all rows
  const headersSet = new Set<string>();
  rows.forEach(row => {
    if (row && typeof row === 'object') {
      Object.keys(row).forEach(key => headersSet.add(key));
    }
  });
  const headers = Array.from(headersSet);

  if (headers.length === 0) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  // If only 1 row, show as vertical table (Label | Value)
  if (rows.length === 1) {
    const table = new Table({
      head: [chalk.bold.cyan('Label'), chalk.bold.cyan('Value')],
      style: { border: ['gray'], head: [] },
      colWidths: [20, 100]
    });
    headers.forEach(h => {
      const val = rows[0][h];
      let displayVal = typeof val === 'object' ? JSON.stringify(val) : String(val ?? '-');
      // Truncate extremely long values in vertical view
      if (displayVal.length > 500) {
        displayVal = displayVal.substring(0, 497) + '...';
      }
      table.push([chalk.bold(h), displayVal]);
    });
    console.log(table.toString());
    return;
  }

  // Horizontal table
  const table = new Table({
    head: headers.map(h => chalk.bold.cyan(h)),
    style: { border: ['gray'], head: [] },
    // Max width for horizontal table columns to prevent terminal wrapping issues
    wordWrap: true
  });

  rows.forEach(row => {
    const tableRow = headers.map(h => {
      const val = row[h];
      const displayVal = typeof val === 'object' ? JSON.stringify(val) : String(val ?? '-');
      // Truncate long values for terminal readability
      return displayVal.length > 50 ? displayVal.substring(0, 47) + '...' : displayVal;
    });
    table.push(tableRow);
  });

  console.log(table.toString());
}

export function printJSON(data: unknown, pretty = true): void {
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

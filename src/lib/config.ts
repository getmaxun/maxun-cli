import fs from 'fs';
import path from 'path';
import os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.maxun');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export interface MaxunConfig {
  apiKey?: string;
  apiUrl?: string;
  email?: string;
}

export function getConfig(): MaxunConfig {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return {};
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveConfig(config: MaxunConfig): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  const existing = getConfig();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({ ...existing, ...config }, null, 2));
}

export function clearConfig(): void {
  if (fs.existsSync(CONFIG_FILE)) {
    fs.unlinkSync(CONFIG_FILE);
  }
}

export function getApiUrl(): string {
  return 'https://app.maxun.dev';
}

export function getApiKey(): string | undefined {
  return process.env.MAXUN_API_KEY || getConfig().apiKey;
}

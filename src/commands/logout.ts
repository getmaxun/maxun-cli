import { Command } from 'commander';
import { clearConfig } from '../lib/config';
import { success } from '../lib/output';

export const logoutCommand = new Command('logout')
  .description('Clear stored credentials')
  .action(() => {
    clearConfig();
    success('Logged out. Config cleared.');
  });

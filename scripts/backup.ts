import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createConnection } from 'node:net';
import { createBackup, restoreBackup, contentExport } from '../server/backup';
import { acquireOperationLock } from './operation-lock';

const [action, file] = process.argv.slice(2);
async function serverRunning() {
  return new Promise<boolean>((r) => {
    const socket = createConnection({ host: '127.0.0.1', port: 3188 });
    socket.setTimeout(1000);
    socket.once('connect', () => {
      socket.destroy();
      r(true);
    });
    socket.once('error', () => r(false));
    socket.once('timeout', () => {
      socket.destroy();
      r(false);
    });
  });
}
try {
  if (!['create', 'restore', 'export'].includes(action) || !file)
    throw Error('Use: npm run backup -- create|restore|export <file>');
  const directory = resolve(process.env.MYFEED_DATA_DIR || 'data');
  const password = process.env.MYFEED_BACKUP_PASSWORD ?? '';
  if (action === 'restore') {
    if (await serverRunning())
      throw Error(
        'Stop MyFeed before restore; this prevents in-flight collection from replacing restored data.',
      );
    const release = acquireOperationLock(directory);
    try {
      restoreBackup(directory, readFileSync(resolve(file), 'utf8'), password);
    } finally {
      release();
    }
    console.log(
      'Backup restored. Restart MyFeed. Previous paired files are retained in data/recovery.',
    );
  } else {
    const body = action === 'create' ? createBackup(directory, password) : contentExport(directory);
    writeFileSync(resolve(file), body, { mode: 0o600, flag: 'wx' });
    console.log(
      action === 'create'
        ? 'Protected backup created. Keep its password separately.'
        : 'Content export created without provider credentials.',
    );
  }
} catch (e) {
  console.error(e instanceof Error ? e.message : 'Backup operation failed.');
  process.exitCode = 1;
}

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** Serialize local lifecycle operations using an atomic directory creation. */
export function acquireOperationLock(directory: string) {
  const root = resolve(directory);
  const lock = join(root, '.operation-lock');
  mkdirSync(root, { recursive: true, mode: 0o700 });
  try {
    mkdirSync(lock, { mode: 0o700 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    let owner: number | undefined;
    try {
      owner = Number(readFileSync(join(lock, 'pid'), 'utf8'));
    } catch {
      // Missing or unreadable pid file leaves owner undefined, which is
      // treated as "not active" below and lets the stale lock be reclaimed.
    }
    let active = false;
    if (Number.isSafeInteger(owner) && owner! > 0) {
      try {
        process.kill(owner!, 0);
        active = true;
      } catch {
        // process.kill(pid, 0) throws when no process with that pid exists,
        // which is exactly the "lock is stale" case this function recovers from.
      }
    }
    if (active) throw Error('Another local lifecycle operation is already running.');
    rmSync(lock, { recursive: true, force: true });
    mkdirSync(lock, { mode: 0o700 });
  }
  writeFileSync(join(lock, 'pid'), String(process.pid), { mode: 0o600 });
  let released = false;
  return () => {
    if (released) return;
    released = true;
    rmSync(lock, { recursive: true, force: true });
  };
}

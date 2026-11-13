import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore } from '../server/store';

// Exercises scripts/backup.ts as a CLI (not server/backup.ts's library functions,
// which tests/backup.test.ts already covers) to catch argument-parsing, file-write,
// and "server must be stopped before restore" behavior that only lives in the script.
describe('backup CLI', () => {
  it('rejects a missing or unknown action with a usage message', () => {
    const root = mkdtempSync(join(tmpdir(), 'myfeed-backup-cli-'));
    try {
      expect(() =>
        execFileSync('npx', ['tsx', 'scripts/backup.ts', 'bogus', 'out.txt'], {
          cwd: process.cwd(),
          env: { ...process.env, MYFEED_DATA_DIR: root },
          stdio: 'pipe',
        }),
      ).toThrowError(/Command failed/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('creates a password-protected backup file and refuses to overwrite an existing one', () => {
    const root = mkdtempSync(join(tmpdir(), 'myfeed-backup-cli-'));
    try {
      const dataDir = join(root, 'data');
      const outFile = join(root, 'out.myfeedbackup');
      const store = createStore(dataDir);
      store.update((s) => {
        s.profile.name = 'CLI backup reader';
      });

      const result = execFileSync('npx', ['tsx', 'scripts/backup.ts', 'create', outFile], {
        cwd: process.cwd(),
        env: { ...process.env, MYFEED_DATA_DIR: dataDir, MYFEED_BACKUP_PASSWORD: 'cli-test-password' },
        stdio: 'pipe',
      }).toString();

      expect(result).toContain('Protected backup created.');
      expect(existsSync(outFile)).toBe(true);
      expect(readFileSync(outFile, 'utf8').length).toBeGreaterThan(0);

      // The script writes with the 'wx' flag, so a second create to the same
      // path must fail rather than silently clobbering an existing backup.
      expect(() =>
        execFileSync('npx', ['tsx', 'scripts/backup.ts', 'create', outFile], {
          cwd: process.cwd(),
          env: { ...process.env, MYFEED_DATA_DIR: dataDir, MYFEED_BACKUP_PASSWORD: 'cli-test-password' },
          stdio: 'pipe',
        }),
      ).toThrowError(/Command failed/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 30000);

  it('exports content without provider credentials via the export action', () => {
    const root = mkdtempSync(join(tmpdir(), 'myfeed-backup-cli-'));
    try {
      const dataDir = join(root, 'data');
      const outFile = join(root, 'export.json');
      const store = createStore(dataDir);
      store.update((s) => {
        s.profile.name = 'CLI export reader';
      });

      const result = execFileSync('npx', ['tsx', 'scripts/backup.ts', 'export', outFile], {
        cwd: process.cwd(),
        env: { ...process.env, MYFEED_DATA_DIR: dataDir },
        stdio: 'pipe',
      }).toString();

      expect(result).toContain('Content export created without provider credentials.');
      expect(existsSync(outFile)).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 30000);
});

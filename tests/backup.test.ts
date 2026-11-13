import { fetchConnection } from '../server/connectors';
import { describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore } from '../server/store';
import { createBackup, restoreBackup, contentExport } from '../server/backup';

const password = 'test-backup-password-only';
describe('protected local backup', () => {
  it('restores paired state and decryptable credentials and exports content without secrets', async () => {
    const root = mkdtempSync(join(tmpdir(), 'myfeed-backup-'));
    try {
      const source = join(root, 'source'),
        target = join(root, 'target'),
        store = createStore(source);
      store.update((s) => {
        s.profile.name = 'Backup reader';
        s.ai = {
          model: 'test-model',
          secretCipher: store.encrypt('test-secret-marker'),
          receipts: [
            {
              id: 'receipt',
              feedId: s.feeds[0].id,
              at: new Date().toISOString(),
              model: 'test-model',
              status: 'uncertain',
              reservedUsd: 0.1,
              message: 'Mocked uncertainty',
            },
          ],
        };
      });
      store.update((s) => {
        s.connections.push({
          id: crypto.randomUUID(),
          feedIds: [s.feeds[0].id],
          kind: 'sample',
          name: 'Backup sample',
          endpoint: '',
          account: '',
          roomId: '',
          userId: '',
          mailbox: 'INBOX',
          enabled: true,
          status: 'active',
          configVersion: 1,
          progress: { newestId: 'fixture-id', partial: false, historyComplete: false },
          syncHealth: { failures: 0, lastSuccess: new Date().toISOString() },
          check: {
            at: new Date().toISOString(),
            version: 1,
            fetched: 13,
            status: 'read-succeeded',
          },
        });
      });
      const entries = await fetchConnection(store.read().connections[0], '');
      store.update((s) => {
        s.entries = entries;
        s.entries[0].saved = true;
        s.entries[0].read = true;
        s.entries[0].localEdit = {
          title: 'Local fixture',
          content: 'Edited fixture 🧭',
          updatedAt: new Date().toISOString(),
        };
        s.entries[0].editVersion = 1;
      });
      const backup = createBackup(source, password);
      expect(backup).not.toContain('Backup reader');
      expect(backup).not.toContain('test-secret-marker');
      const original = createStore(target);
      original.update((s) => {
        s.profile.name = 'Previous reader';
      });
      restoreBackup(target, backup, password);
      const restored = createStore(target);
      expect(restored.read()).toEqual(JSON.parse(JSON.stringify(store.read())));
      expect(restored.decrypt(restored.read().ai.secretCipher)).toBe('test-secret-marker');
      expect(existsSync(join(target, 'recovery'))).toBe(true);
      const exported = contentExport(source);
      expect(exported).toContain('Backup reader');
      expect(exported).not.toContain('secretCipher');
      expect(exported).not.toContain('test-secret-marker');
      expect(exported).not.toContain('test-model');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  it('rejects wrong passwords, tampering, unknown formats and interrupted restores without resetting data', () => {
    const root = mkdtempSync(join(tmpdir(), 'myfeed-backup-'));
    try {
      const source = join(root, 'source'),
        target = join(root, 'target');
      createStore(source);
      createStore(target);
      const archive = createBackup(source, password),
        before = readFileSync(join(target, 'store.json'));
      for (const [body, key] of [
        [archive, 'wrong-password'],
        [archive.replace('myfeed-backup', 'unknown'), password],
        [archive.replace('"version":1', '"version":99'), password],
      ])
        expect(() => restoreBackup(target, body, key)).toThrow(/validation failed/);
      expect(readFileSync(join(target, 'store.json'))).toEqual(before);
      mkdirSync(join(target, '.restore-pending'));
      expect(() => createStore(target)).toThrow(/interrupted restore/);
      expect(readFileSync(join(target, 'store.json'))).toEqual(before);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  it('rejects damaged checkpoint and receipt metadata before startup or archive creation', () => {
    const root = mkdtempSync(join(tmpdir(), 'myfeed-backup-'));
    try {
      const store = createStore(root);
      store.update((s) => {
        s.ai.receipts = [
          {
            id: 'bad',
            feedId: s.feeds[0].id,
            at: new Date().toISOString(),
            model: 'fixture',
            status: 'uncertain',
            reservedUsd: -1,
          },
        ];
      });
      expect(() => createStore(root)).toThrow(/damaged or incompatible/);
      expect(() => createBackup(root, password)).toThrow();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  it('fails visibly for missing keys and corrupted stores rather than generating replacement credentials', () => {
    const root = mkdtempSync(join(tmpdir(), 'myfeed-backup-'));
    try {
      const store = createStore(root);
      store.update((s) => {
        s.ai.secretCipher = store.encrypt('fixture-secret');
      });
      rmSync(join(root, 'secret.key'));
      expect(() => createStore(root)).toThrow(/key is missing/);
      expect(existsSync(join(root, 'secret.key'))).toBe(false);
      writeFileSync(join(root, 'secret.key'), Buffer.alloc(32));
      expect(() => createStore(root)).toThrow(/paired store and key/);
      writeFileSync(join(root, 'store.json'), 'not json');
      expect(() => createStore(root)).toThrow();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

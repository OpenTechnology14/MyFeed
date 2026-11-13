import { describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { acquireOperationLock } from '../scripts/operation-lock';

describe('local lifecycle operation lock', () => {
  it('serializes operations and releases its marker', () => {
    const directory = mkdtempSync(join(tmpdir(), 'myfeed-operation-lock-'));
    try {
      const release = acquireOperationLock(directory);
      expect(() => acquireOperationLock(directory)).toThrow('already running');
      release();
      expect(existsSync(join(directory, '.operation-lock'))).toBe(false);
      const second = acquireOperationLock(directory);
      second();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('recovers a stale marker without touching the surrounding data', () => {
    const directory = mkdtempSync(join(tmpdir(), 'myfeed-operation-lock-'));
    try {
      const lock = join(directory, '.operation-lock');
      mkdirSync(lock, { recursive: true });
      writeFileSync(join(lock, 'pid'), '999999999');
      writeFileSync(join(directory, 'store.json'), '{"fixture":true}');
      const release = acquireOperationLock(directory);
      expect(existsSync(join(directory, 'store.json'))).toBe(true);
      release();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

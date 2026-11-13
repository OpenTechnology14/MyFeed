import { describe, expect, it, vi, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createShutdown } from '../server/shutdown';

describe('createShutdown', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('clears the timer and closes the server, without actually exiting the process', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit must not be called directly during shutdown');
    });
    const clearTimer = vi.fn();
    const close = vi.fn((cb: () => void) => cb());
    const shutdown = createShutdown({ server: { close }, clearTimer, pid: process.pid });

    expect(() => shutdown()).not.toThrow();

    expect(clearTimer).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
    expect(exitSpy).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(0);
  });

  it('only calls the shutdown sequence once even if invoked multiple times (e.g. SIGTERM then SIGINT)', () => {
    const clearTimer = vi.fn();
    const close = vi.fn((cb: () => void) => cb());
    const shutdown = createShutdown({ server: { close }, clearTimer, pid: process.pid });

    shutdown();
    shutdown();
    shutdown();

    expect(clearTimer).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('removes the managed-process record when it still points at this pid', () => {
    const root = mkdtempSync(join(tmpdir(), 'myfeed-shutdown-'));
    try {
      const processRecord = join(root, 'local-process.json');
      writeFileSync(processRecord, JSON.stringify({ pid: process.pid }));
      const close = vi.fn((cb: () => void) => cb());
      const shutdown = createShutdown({
        server: { close },
        clearTimer: vi.fn(),
        pid: process.pid,
        processRecord,
      });

      shutdown();

      expect(existsSync(processRecord)).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('leaves the managed-process record alone when it points at a different pid', () => {
    const root = mkdtempSync(join(tmpdir(), 'myfeed-shutdown-'));
    try {
      const processRecord = join(root, 'local-process.json');
      writeFileSync(processRecord, JSON.stringify({ pid: process.pid + 1 }));
      const close = vi.fn((cb: () => void) => cb());
      const shutdown = createShutdown({
        server: { close },
        clearTimer: vi.fn(),
        pid: process.pid,
        processRecord,
      });

      shutdown();

      expect(existsSync(processRecord)).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('does not throw when the process record is missing or malformed', () => {
    const root = mkdtempSync(join(tmpdir(), 'myfeed-shutdown-'));
    try {
      const processRecord = join(root, 'local-process.json');
      writeFileSync(processRecord, 'not json');
      const close = vi.fn((cb: () => void) => cb());
      const shutdown = createShutdown({
        server: { close },
        clearTimer: vi.fn(),
        pid: process.pid,
        processRecord,
      });

      expect(() => shutdown()).not.toThrow();
      expect(process.exitCode).toBe(0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

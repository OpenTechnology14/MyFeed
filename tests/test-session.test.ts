import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, symlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { validatedTestSession } from '../server/test-session';
import verifyIsolatedApi from './e2e/global-setup';
const session = '11111111-1111-4111-8111-111111111111';
describe('browser-test workspace isolation', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
  it('does not expose a test marker in a normal workspace', () => {
    vi.stubEnv('MYFEED_E2E_SESSION', undefined);
    expect(validatedTestSession(resolve('data'))).toBeUndefined();
  });
  it('accepts only a named temporary sandbox and refuses production/default data before opening a store', () => {
    const root = mkdtempSync(join(tmpdir(), 'myfeed-e2e-guard-'));
    vi.stubEnv('MYFEED_E2E_SESSION', session);
    vi.stubEnv('NODE_ENV', 'test');
    try {
      expect(validatedTestSession(root)).toBe(session);
      expect(validatedTestSession(join(tmpdir(), 'myfeed-e2e-not-created-yet'))).toBe(session);
      expect(() => validatedTestSession(resolve('data'))).toThrow('production data');
      vi.stubEnv('NODE_ENV', 'production');
      expect(() => validatedTestSession(root)).toThrow('production data');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  it('rejects a sandbox-named symlink pointing to an ordinary directory', () => {
    const root = mkdtempSync(join(tmpdir(), 'myfeed-isolation-'));
    const target = join(root, 'ordinary');
    mkdirSync(target);
    symlinkSync(target, join(root, 'myfeed-e2e-link'));
    vi.stubEnv('MYFEED_E2E_SESSION', session);
    vi.stubEnv('NODE_ENV', 'test');
    try {
      expect(() => validatedTestSession(join(root, 'myfeed-e2e-link'))).toThrow('production data');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  it('waits through an unmarked Vite startup 500 before accepting the exact API marker', async () => {
    vi.stubEnv('MYFEED_E2E_SESSION', session);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 500 }))
      .mockResolvedValueOnce(new Response('{}', { headers: { 'X-MyFeed-Test-Session': session } }));
    vi.stubGlobal('fetch', fetchMock);
    await verifyIsolatedApi();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1].headers['X-MyFeed-Test-Session']).toBe(session);
  });
  it('refuses a normal or mismatched successful API without retrying', async () => {
    vi.stubEnv('MYFEED_E2E_SESSION', session);
    for (const headers of [
      new Headers(),
      new Headers({ 'X-MyFeed-Test-Session': 'different-session' }),
    ]) {
      const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { headers }));
      vi.stubGlobal('fetch', fetchMock);
      await expect(verifyIsolatedApi()).rejects.toThrow('Refusing browser tests');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    }
  });
  it('refuses normal API denial or a marked API failure without treating it as startup', async () => {
    vi.stubEnv('MYFEED_E2E_SESSION', session);
    for (const response of [
      new Response('', { status: 403 }),
      new Response('', { status: 500, headers: { 'X-MyFeed-Test-Session': session } }),
    ]) {
      const fetchMock = vi.fn().mockResolvedValue(response);
      vi.stubGlobal('fetch', fetchMock);
      await expect(verifyIsolatedApi()).rejects.toThrow('Refusing browser tests');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    }
  });
});

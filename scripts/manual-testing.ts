import { spawn } from 'node:child_process';
import { randomUUID, createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer as createNetServer } from 'node:net';
import { createServer } from 'vite';
import { TEST_SESSION_HEADER } from '../server/test-session';

// Browser requests go through this run's marked proxy. A normal API refuses them.
const root = resolve(import.meta.dirname, '..');
const fingerprint = () =>
  ['store.json', 'secret.key']
    .map((name) => {
      const path = join(root, 'data', name);
      return existsSync(path)
        ? createHash('sha256').update(readFileSync(path)).digest('hex')
        : 'absent';
    })
    .join(':');
const before = fingerprint();
try {
  for (const port of [3188, 5188]) {
    await new Promise<void>((resolvePort, reject) => {
      const probe = createNetServer();
      probe.once('error', () =>
        reject(Error(`Port ${port} is occupied. Stop normal servers before manual testing.`)),
      );
      probe.listen(port, '127.0.0.1', () => probe.close(() => resolvePort()));
    });
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Port check failed.');
  process.exit(1);
}
const session = randomUUID();
const directory = mkdtempSync(join(tmpdir(), 'myfeed-e2e-manual-'));
const api = spawn(process.execPath, ['--import', 'tsx', join(root, 'server/index.ts')], {
  cwd: root,
  env: {
    ...process.env,
    NODE_ENV: 'test',
    MYFEED_DATA_DIR: directory,
    MYFEED_E2E_SESSION: session,
    MYFEED_MANAGED_ROOT: '',
  },
  stdio: 'inherit',
});
let exited = false;
const apiExit = new Promise<void>((resolveExit) =>
  api.once('exit', () => {
    exited = true;
    resolveExit();
  }),
);
let web: Awaited<ReturnType<typeof createServer>> | undefined;
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await web?.close();
  if (!exited) api.kill('SIGTERM');
  await apiExit;
  if (fingerprint() !== before) {
    console.error(
      'FAIL: normal store/key fingerprints changed during this run. Investigate before further testing.',
    );
    process.exitCode = 1;
  } else
    console.log(
      'PASS: normal store/key fingerprints unchanged. Temporary fixture retained at ' + directory,
    );
}
process.once('SIGINT', () => void stop());
process.once('SIGTERM', () => void stop());
try {
  let ready = false;
  for (let attempt = 0; attempt < 100 && !stopping; attempt++) {
    if (exited) throw Error('Isolated API exited during startup.');
    const response = await fetch('http://127.0.0.1:3188/api/state', {
      headers: { [TEST_SESSION_HEADER]: session },
      signal: AbortSignal.timeout(1000),
    }).catch(() => undefined);
    if (response) {
      const marker = response.headers.get(TEST_SESSION_HEADER);
      await response.body?.cancel();
      if (response.ok && marker === session) {
        ready = true;
        break;
      }
      throw Error('Refusing manual testing: API session marker does not match.');
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  if (stopping) await apiExit;
  else {
    if (!ready) throw Error('Isolated API did not become ready.');
    web = await createServer({
      root,
      configFile: join(root, 'vite.config.ts'),
      server: {
        proxy: {
          '/api': { target: 'http://127.0.0.1:3188', headers: { [TEST_SESSION_HEADER]: session } },
        },
      },
    });
    await web.listen();
    const proxied = await fetch('http://127.0.0.1:5188/api/state', {
      signal: AbortSignal.timeout(1000),
    });
    const matching = proxied.ok && proxied.headers.get(TEST_SESSION_HEADER) === session;
    await proxied.body?.cancel();
    if (!matching) throw Error('Refusing manual testing: proxy/API session marker does not match.');
    console.log(
      `MANUAL TEST ONLY — fictional/disposable workspace\nVerified session: ${session}\nTemporary store: ${directory}\nOpen http://127.0.0.1:5188/\nChecklist: docs/agent-registries/CLICK_TREE_MANUAL_CHECKLIST.md\nCtrl+C stops both servers; restart the user preview afterward.`,
    );
    await apiExit;
    if (!stopping) {
      process.exitCode = 1;
      await stop();
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Manual testing failed.');
  process.exitCode = 1;
  await stop();
}

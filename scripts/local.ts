import { spawn, execFileSync } from 'node:child_process';
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  openSync,
  closeSync,
} from 'node:fs';
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';
import { createBackup } from '../server/backup';
import { acquireOperationLock } from './operation-lock';
const root = resolve(import.meta.dirname, '..');
const dir = resolve(process.env.MYFEED_DATA_DIR || join(root, 'data'));
const record = join(dir, 'local-process.json');
const entry = join(root, 'server/index.ts');
function managed(): number | undefined {
  if (!existsSync(record)) return;
  const data = JSON.parse(readFileSync(record, 'utf8'));
  if (!Number.isSafeInteger(data.pid) || data.root !== root)
    throw Error('Invalid local process record.');
  try {
    process.kill(data.pid, 0);
  } catch {
    return;
  }
  const command = execFileSync('ps', ['-p', String(data.pid), '-o', 'command='], {
    encoding: 'utf8',
  });
  if (!command.includes(entry) || !command.includes('--import'))
    throw Error('Process identity changed; refusing to signal it.');
  return data.pid;
}
const loginFile = join(homedir(), 'Library/LaunchAgents/com.myfeed.local.plist');
const xml = (value: string) =>
  value.replace(
    /[<>&"']/g,
    (character) =>
      ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[character]!,
  );
const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
async function stop() {
  const release = acquireOperationLock(dir);
  try {
    const pid = managed();
    if (!pid) {
      rmSync(record, { force: true });
      console.log('MyFeed is stopped.');
      return;
    }
    process.kill(pid, 'SIGTERM');
    for (let i = 0; i < 300; i++) {
      await pause(100);
      try {
        process.kill(pid, 0);
      } catch {
        rmSync(record, { force: true });
        console.log('MyFeed stopped after draining active requests.');
        return;
      }
    }
    throw Error('Shutdown is still draining. Wait and check status; no forced kill was sent.');
  } finally {
    release();
  }
}
async function start() {
  const release = acquireOperationLock(dir);
  try {
    if (managed()) {
      console.log('MyFeed is running at http://127.0.0.1:3188');
      return;
    }
    if (!existsSync(join(root, 'dist/index.html')))
      throw Error('Run npm run build before starting.');
    try {
      await fetch('http://127.0.0.1:3188/api/state', { signal: AbortSignal.timeout(1000) });
      throw Error('Port 3188 is already occupied. Stop the existing server first.');
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Port')) throw error;
    }
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    const log = openSync(join(dir, 'local-server.log'), 'a', 0o600);
    const child = spawn(process.execPath, ['--import', 'tsx', entry], {
      cwd: root,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        MYFEED_DATA_DIR: dir,
        MYFEED_MANAGED_ROOT: root,
      },
      detached: true,
      stdio: ['ignore', log, log],
    });
    closeSync(log);
    if (!child.pid) throw Error('Could not launch Node.');
    writeFileSync(
      record,
      JSON.stringify({ pid: child.pid, root, startedAt: new Date().toISOString() }),
      { mode: 0o600 },
    );
    child.unref();
    for (let i = 0; i < 100; i++) {
      await pause(100);
      try {
        process.kill(child.pid, 0);
      } catch {
        rmSync(record, { force: true });
        throw Error('Startup failed. Check data/local-server.log.');
      }
      try {
        const response = await fetch('http://127.0.0.1:3188/', {
          signal: AbortSignal.timeout(500),
        });
        if (response.ok) {
          console.log('MyFeed: http://127.0.0.1:3188');
          return;
        }
      } catch {
        // Server isn't accepting connections yet during startup; keep polling
        // until it responds or the retry budget below is exhausted.
      }
    }
    throw Error('Server is still starting. Check npm run local -- status.');
  } finally {
    release();
  }
}
try {
  if (!['darwin', 'linux'].includes(process.platform))
    throw Error('The local launcher currently supports macOS and Linux with ps.');
  const command = process.argv[2];
  if (command === 'start') await start();
  else if (command === 'stop') await stop();
  else if (command === 'status')
    console.log(managed() ? 'MyFeed is running at http://127.0.0.1:3188' : 'MyFeed is stopped.');
  else if (command === 'login-enable') {
    if (process.platform !== 'darwin') throw Error('Login launch is supported on macOS only.');
    mkdirSync(resolve(loginFile, '..'), { recursive: true });
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    closeSync(openSync(join(dir, 'local-server.log'), 'a', 0o600));
    const body = `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>Label</key><string>com.myfeed.local</string><key>ProgramArguments</key><array><string>${xml(process.execPath)}</string><string>--import</string><string>tsx</string><string>${xml(entry)}</string></array><key>WorkingDirectory</key><string>${xml(root)}</string><key>EnvironmentVariables</key><dict><key>NODE_ENV</key><string>production</string><key>MYFEED_DATA_DIR</key><string>${xml(dir)}</string><key>MYFEED_MANAGED_ROOT</key><string>${xml(root)}</string></dict><key>StandardOutPath</key><string>${xml(join(dir, 'local-server.log'))}</string><key>StandardErrorPath</key><string>${xml(join(dir, 'local-server.log'))}</string><key>RunAtLoad</key><true/><key>KeepAlive</key><false/></dict></plist>`;
    writeFileSync(loginFile, body, { mode: 0o600, flag: 'wx' });
    console.log(
      'Explicit login launch configured for the next login. Keep this checkout and Node path in place.',
    );
  } else if (command === 'login-disable') {
    if (process.platform !== 'darwin') throw Error('Login launch is supported on macOS only.');
    if (existsSync(loginFile)) {
      const body = readFileSync(loginFile, 'utf8');
      if (!body.includes(xml(entry)))
        throw Error('Login configuration belongs to another checkout; refusing removal.');
      try {
        execFileSync('launchctl', ['bootout', `gui/${process.getuid!()}`, loginFile], {
          stdio: 'ignore',
        });
      } catch {
        // launchctl bootout fails if the agent isn't currently loaded (e.g. after
        // a reboot); the plist is removed below regardless, so disable still succeeds.
      }
      rmSync(loginFile);
      console.log('Login launch disabled.');
    } else console.log('Login launch is not enabled.');
  } else if (command === 'update') {
    const password = process.env.MYFEED_BACKUP_PASSWORD;
    if (!password)
      throw Error('Set MYFEED_BACKUP_PASSWORD before update to protect the rollback archive.');
    if (password.length < 12 || password.length > 500)
      throw Error('Use a backup password with 12–500 characters.');
    await stop();
    if (existsSync(join(dir, 'store.json'))) {
      const archive = createBackup(dir, password);
      const output = join(dir, `pre-update-${Date.now()}.myfeed-backup`);
      writeFileSync(output, archive, { mode: 0o600, flag: 'wx' });
      console.log('Protected pre-update backup saved in the data directory.');
    }
    execFileSync('npm', ['run', 'verify'], { cwd: root, stdio: 'inherit' });
    await start();
  } else throw Error('Usage: npm run local -- start|stop|status|update|login-enable|login-disable');
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Local launch failed.');
  process.exitCode = 1;
}

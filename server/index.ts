import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import express from 'express';
import { resolve } from 'node:path';
import { createApp } from './app';
import { createStore } from './store';
import { validatedTestSession } from './test-session';
import { createShutdown } from './shutdown';
const managedRoot = process.env.MYFEED_MANAGED_ROOT;
const processRecord = managedRoot
  ? join(resolve(process.env.MYFEED_DATA_DIR || 'data'), 'local-process.json')
  : undefined;
const dataDirectory = resolve(process.env.MYFEED_DATA_DIR || 'data');
validatedTestSession(dataDirectory);
const { app, tick } = createApp(createStore(dataDirectory));
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(resolve('dist')));
  app.get('*', (_req, res) => res.sendFile(resolve('dist/index.html')));
}
const server = app.listen(3188, '127.0.0.1', () => {
  if (processRecord) {
    mkdirSync(resolve(processRecord, '..'), { recursive: true, mode: 0o700 });
    writeFileSync(
      processRecord,
      JSON.stringify({ pid: process.pid, root: managedRoot, startedAt: new Date().toISOString() }),
      { mode: 0o600 },
    );
  }
  console.log('MyFeed API: http://127.0.0.1:3188');
});
server.on('error', () => {
  console.error('MyFeed could not bind its local port. Check whether another server is running.');
  process.exitCode = 1;
  clearInterval(timer);
});
const timer = setInterval(() => {
  tick().catch(() =>
    console.error('Background sync failed. Check source configuration in MyFeed.'),
  );
}, 30000);
timer.unref();

const shutdown = createShutdown({
  server,
  clearTimer: () => clearInterval(timer),
  pid: process.pid,
  processRecord,
});
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

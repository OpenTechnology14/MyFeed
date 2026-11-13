import { readFileSync, existsSync, rmSync } from 'node:fs';

export interface ShutdownDeps {
  server: { close: (callback: () => void) => unknown };
  clearTimer: () => void;
  pid: number;
  processRecord?: string;
}

/**
 * Builds the graceful-shutdown handler for the local server: stop the
 * background sync timer, close the HTTP server, and remove this process's
 * managed-lifecycle record if it still owns it. Dependencies are passed in
 * rather than closed over so this is callable directly from a test with
 * fakes, instead of only via a real SIGTERM/SIGINT delivered to the process.
 */
export function createShutdown(deps: ShutdownDeps) {
  let stopping = false;
  return function shutdown() {
    if (stopping) return;
    stopping = true;
    deps.clearTimer();
    deps.server.close(() => {
      if (deps.processRecord && existsSync(deps.processRecord)) {
        try {
          if (JSON.parse(readFileSync(deps.processRecord, 'utf8')).pid === deps.pid)
            rmSync(deps.processRecord);
        } catch {
          // Best-effort cleanup of the managed-process record; if it's missing,
          // unreadable, or already replaced by another process, shutdown must
          // still complete rather than fail on a non-essential cleanup step.
        }
      }
      process.exitCode = 0;
    });
  };
}

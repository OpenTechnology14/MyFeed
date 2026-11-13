import { existsSync, realpathSync } from 'node:fs';
import { resolve, basename, dirname, join, sep } from 'node:path';
import { tmpdir } from 'node:os';

export const TEST_SESSION_HEADER = 'X-MyFeed-Test-Session';
export function validatedTestSession(directory: string) {
  const session = process.env.MYFEED_E2E_SESSION;
  if (!session) return undefined;
  const path = resolve(directory),
    temporaryRoot = realpathSync(tmpdir());
  const actual = existsSync(path)
    ? realpathSync(path)
    : join(realpathSync(dirname(path)), basename(path));
  if (
    process.env.NODE_ENV === 'production' ||
    !/^[0-9a-f-]{36}$/.test(session) ||
    !actual.startsWith(temporaryRoot + sep) ||
    !basename(actual).startsWith('myfeed-e2e-')
  )
    throw Error(
      'Browser tests require an isolated myfeed-e2e temporary directory; production data is forbidden.',
    );
  return session;
}

import { beforeEach, describe, it, expect, vi } from 'vitest';
import type { Connection } from '../shared/model';
const mocks = vi.hoisted(() => ({
  connect: vi.fn(),
  lock: vi.fn(),
  fetchAll: vi.fn(),
  fetchOne: vi.fn(),
  logout: vi.fn(),
  release: vi.fn(),
  mailbox: { exists: 400, uidValidity: 123n, uidNext: 401 },
  constructor: vi.fn(),
}));
vi.mock('imapflow', () => ({
  ImapFlow: class {
    mailbox = mocks.mailbox;
    connect = mocks.connect;
    getMailboxLock = mocks.lock;
    fetchAll = mocks.fetchAll;
    fetchOne = mocks.fetchOne;
    logout = mocks.logout;
    close = vi.fn();
    constructor(options: unknown) {
      mocks.constructor(options);
    }
  },
}));
vi.mock('../server/network', () => ({
  resolvePublicHost: vi.fn().mockResolvedValue({ address: '203.0.113.1', family: 4 }),
  fetchPublic: vi.fn(),
}));
vi.mock('mailparser', () => ({
  simpleParser: vi.fn().mockResolvedValue({
    subject: 'Fixture mail',
    text: 'Original fixture body',
    from: { text: 'Sender' },
    date: new Date('2026-10-05T00:00:00Z'),
  }),
}));
import { fetchConnection } from '../server/connectors';
const connection: Connection = {
  id: 'email',
  kind: 'email',
  name: 'Test mailbox',
  endpoint: 'imap.example.com',
  account: 'test@example.com',
  mailbox: 'INBOX',
  roomId: '',
  userId: '',
  enabled: true,
  status: 'ready',
};
describe('IMAP incremental collection (mocked, no authenticated provider proof)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mailbox.exists = 400;
    mocks.mailbox.uidValidity = 123n;
    mocks.mailbox.uidNext = 401;
    mocks.lock.mockResolvedValue({ release: mocks.release });
    mocks.fetchAll.mockResolvedValue([]);
    mocks.fetchOne.mockResolvedValue({ source: Buffer.from('fixture') });
  });
  it('bounds incremental UID scans and opens the mailbox read-only without fetching deleted slots', async () => {
    const rows = await fetchConnection(
      { ...connection, progress: { uidValidity: '123', maxUid: 200, minUid: 1 } },
      'fixture-password',
    );
    expect(mocks.lock).toHaveBeenCalledWith('INBOX', { readOnly: true });
    expect(mocks.fetchAll.mock.calls[0][0]).toBe('190:289');
    expect(mocks.fetchAll.mock.calls[0][2]).toEqual({ uid: true });
    expect(rows.progress).toMatchObject({ maxUid: 289, minUid: 1, partial: true });
    expect(mocks.fetchOne).not.toHaveBeenCalled();
    expect(mocks.release).toHaveBeenCalled();
    expect(mocks.logout).toHaveBeenCalled();
    expect(mocks.constructor.mock.calls[0][0]).toMatchObject({
      logger: false,
      tls: { servername: 'imap.example.com' },
    });
  });
  it('advances older checkpoints across empty/deleted UID ranges', async () => {
    const rows = await fetchConnection(
      { ...connection, progress: { uidValidity: '123', maxUid: 400, minUid: 300 } },
      'fixture',
      { older: true },
    );
    expect(mocks.fetchAll.mock.calls[0][0]).toBe('200:299');
    expect(rows.progress).toMatchObject({ maxUid: 400, minUid: 200, historyComplete: false });
  });
  it('records an empty mailbox and changed namespace without leaving stale partial work', async () => {
    mocks.mailbox.exists = 0;
    const rows = await fetchConnection(
      { ...connection, progress: { uidValidity: 'old', maxUid: 500, partial: true } },
      'fixture',
    );
    expect(rows).toHaveLength(0);
    expect(rows.progress).toMatchObject({
      uidValidity: '123',
      maxUid: 0,
      minUid: 0,
      partial: false,
      historyComplete: true,
    });
    expect(mocks.fetchAll).not.toHaveBeenCalled();
  });
  it('resets namespace after UIDVALIDITY changes and skips oversized messages before body fetch', async () => {
    mocks.mailbox.exists = 2;
    mocks.fetchAll.mockResolvedValue([
      { uid: 10, size: 1000001 },
      { uid: 11, size: 500 },
    ]);
    const rows = await fetchConnection(
      { ...connection, progress: { uidValidity: 'old', maxUid: 999, minUid: 900 } },
      'fixture',
    );
    expect(mocks.fetchAll.mock.calls[0][0]).toBe('1:*');
    expect(mocks.fetchOne).toHaveBeenCalledTimes(1);
    expect(mocks.fetchOne.mock.calls[0][0]).toBe(11);
    expect(rows).toHaveLength(1);
    expect(rows[0].externalId).toBe('123:11');
    expect(rows.progress).toMatchObject({
      uidValidity: '123',
      maxUid: 11,
      minUid: 10,
      historyComplete: true,
      skippedOversized: 1,
    });
  });
});

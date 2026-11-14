import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { validateLocalState } from './backup';
import { initialState, type State } from '../shared/model';

export function createStore(directory = process.env.MYFEED_DATA_DIR || resolve('data')) {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const path = resolve(directory, 'store.json'),
    keyPath = resolve(directory, 'secret.key');
  if (existsSync(resolve(directory, '.restore-pending')))
    throw new Error(
      'An interrupted restore needs recovery. Restore paired store/key files before starting MyFeed.',
    );
  if (existsSync(path) && !existsSync(keyPath))
    throw new Error(
      'Local encryption key is missing. Restore store.json and secret.key together from backup.',
    );
  if (!existsSync(keyPath)) writeFileSync(keyPath, randomBytes(32), { mode: 0o600 });
  const key = readFileSync(keyPath);
  if (key.length !== 32)
    throw new Error('Invalid local encryption key. Restore data/secret.key from your backup.');
  let state: State = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : initialState();
  if (state.schemaVersion !== 1 || !Array.isArray(state.feeds) || !Array.isArray(state.entries))
    throw new Error('Unsupported or damaged local store. Restore a backup.');
  try {
    validateLocalState(state, key);
  } catch {
    throw new Error(
      'Local store or encryption key is damaged or incompatible. Restore the paired store and key from backup.',
    );
  }
  function persist(next: State) {
    const temp = `${path}.tmp`;
    writeFileSync(temp, JSON.stringify(next, null, 2), { mode: 0o600 });
    renameSync(temp, path);
    state = next;
  }
  let migrated = false;
  for (const receipt of state.outbound?.receipts ?? []) {
    if (receipt.status === 'sending') {
      receipt.status = 'unknown';
      receipt.message =
        'Server restarted before acknowledgment. Check the provider; no automatic retry.';
      const draft = state.outbound?.drafts.find((draft) => draft.id === receipt.draftId);
      if (draft) draft.status = 'unknown';
      migrated = true;
    }
  }
  for (const f of state.feeds) {
    if (f.aiPipeline === undefined) {
      f.aiPipeline = { profile: 'digest', instructions: '' };
      migrated = true;
    }
    const defaults = {
      textOverrides: {},
      showMedia: true,
      mediaSize: 'normal',
      fontSize: 14,
      lineSpacing: 1.7,
      readingWidth: 'full',
      conversationPreviewCount: 3,
    };
    for (const [key, value] of Object.entries(defaults))
      if (!(key in f)) {
        Object.assign(f, { [key]: value });
        migrated = true;
      }
    if (f.textLimit === undefined) {
      f.textLimit = { mode: 'default' };
      migrated = true;
    }
    if (f.alertsEnabled === undefined || f.alertHandles === undefined) {
      f.alertsEnabled ??= false;
      f.alertHandles ??= [];
      migrated = true;
    }
  }
  for (const c of state.connections) {
    if (c.configVersion === undefined) {
      c.configVersion = 1;
      migrated = true;
    }
    if (!c.feedIds) {
      c.feedIds = c.feedId ? [c.feedId] : [];
      c.background = state.feeds.some((f) => c.feedIds!.includes(f.id) && f.background);
      delete c.feedId;
      migrated = true;
    }
  }
  if (!existsSync(path) || migrated) persist(state);
  return {
    directory: resolve(directory),
    read: () => state,
    update(fn: (draft: State) => void) {
      const draft = structuredClone(state);
      fn(draft);
      draft.revision++;
      persist(draft);
      return state;
    },
    public() {
      return {
        ...state,
        connections: state.connections.map(({ secretCipher, posting, ...c }) => {
          if (!posting) return { ...c, hasSecret: !!secretCipher };
          const { secretCipher: writingSecret, ...writing } = posting;
          return {
            ...c,
            hasSecret: !!secretCipher,
            posting: { ...writing, hasSecret: !!writingSecret },
          };
        }),
        ai: {
          model: state.ai.model,
          hasSecret: !!state.ai.secretCipher,
          receipts: state.ai.receipts,
        },
      };
    },
    encrypt(secret: string) {
      const iv = randomBytes(12),
        cipher = createCipheriv('aes-256-gcm', key, iv);
      const body = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
      return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64');
    },
    decrypt(value?: string) {
      if (!value) return '';
      const data = Buffer.from(value, 'base64');
      const decipher = createDecipheriv('aes-256-gcm', key, data.subarray(0, 12));
      decipher.setAuthTag(data.subarray(12, 28));
      return Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString('utf8');
    },
  };
}
export type Store = ReturnType<typeof createStore>;

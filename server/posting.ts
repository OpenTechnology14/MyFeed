import { z } from 'zod';
import { fetchPublic } from './network';
import { safeUrl, plainText } from '../shared/pipeline';
import type { Connection } from '../shared/model';
import type { DraftBody, WritingIdentity, PostReceipt } from '../shared/posting';

function origin(connection: Connection) {
  const url = new URL(connection.endpoint);
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443'))
    throw Error('Posting requires a public HTTPS server on the standard port.');
  return url.origin;
}
function headers(connection: Connection, secret: string): Record<string, string> {
  if (!secret || /[\r\n]/.test(secret)) throw Error('Configure a separate writing credential.');
  return connection.kind === 'rocket'
    ? { 'X-Auth-Token': secret, 'X-User-Id': connection.posting!.userId }
    : { Authorization: `Bearer ${secret}` };
}
export async function checkWritingAccount(
  connection: Connection,
  secret: string,
): Promise<WritingIdentity> {
  const base = origin(connection),
    auth = headers(connection, secret);
  if (connection.kind === 'rocket') {
    const user = z
      .object({
        _id: z.string().min(1).max(200),
        username: z.string().min(1).max(200),
        active: z.boolean().optional(),
      })
      .parse(JSON.parse(await fetchPublic(`${base}/api/v1/me`, { headers: auth })));
    if (user._id !== connection.posting?.userId || user.active === false)
      throw Error('Writing account identity does not match its configured user ID.');
    const info = z
      .object({
        success: z.literal(true),
        channel: z.object({
          _id: z.string(),
          t: z.literal('c'),
          name: z.string(),
          ro: z.boolean().optional(),
          archived: z.boolean().optional(),
          encrypted: z.boolean().optional(),
          broadcast: z.boolean().optional(),
        }),
      })
      .parse(
        JSON.parse(
          await fetchPublic(
            `${base}/api/v1/channels.info?roomId=${encodeURIComponent(connection.roomId)}`,
            { headers: auth },
          ),
        ),
      );
    if (
      info.channel._id !== connection.roomId ||
      info.channel.ro ||
      info.channel.archived ||
      info.channel.encrypted ||
      info.channel.broadcast
    )
      throw Error(
        'Posting requires a joined, writable public channel without encryption or broadcast restrictions.',
      );
    return {
      id: user._id,
      username: plainText(user.username).slice(0, 200) || user._id,
      maxCharacters: 2000,
      checkedAt: new Date().toISOString(),
    };
  }
  if (connection.kind !== 'mastodon')
    throw Error('Posting is supported only for Rocket.Chat and Mastodon-compatible connections.');
  const user = z
    .object({ id: z.string().min(1).max(200), acct: z.string().min(1).max(200) })
    .parse(
      JSON.parse(
        await fetchPublic(`${base}/api/v1/accounts/verify_credentials`, { headers: auth }),
      ),
    );
  const instance = z
    .object({
      configuration: z.object({
        statuses: z.object({ max_characters: z.number().int().positive() }),
      }),
    })
    .parse(JSON.parse(await fetchPublic(`${base}/api/v2/instance`)));
  return {
    id: user.id,
    username: plainText(user.acct).slice(0, 200) || user.id,
    maxCharacters: Math.min(instance.configuration.statuses.max_characters, 5000),
    checkedAt: new Date().toISOString(),
  };
}
export function postingDestination(connection: Connection, body: DraftBody) {
  return connection.kind === 'rocket'
    ? `${origin(connection)} · channel ${connection.roomId}`
    : `${origin(connection)} · ${body.visibility === 'private' ? 'followers only' : body.visibility}`;
}
export function validatePostingBody(
  connection: Connection,
  body: DraftBody,
  identity: WritingIdentity,
) {
  if (!body.text.trim()) throw Error('Write a message before reviewing.');
  if ([...body.text].length + [...body.warning].length > identity.maxCharacters)
    throw Error(`Message and warning exceed the ${identity.maxCharacters}-character limit.`);
  if (
    connection.kind === 'rocket' &&
    (body.warning || body.language || body.visibility !== 'unlisted')
  )
    throw Error(
      'Rocket.Chat uses the configured channel; Fediverse audience/warning/language controls do not apply.',
    );
}
export async function checkReplyTarget(connection: Connection, secret: string, replyId: string) {
  if (!replyId) return;
  const base = origin(connection),
    auth = headers(connection, secret);
  if (connection.kind === 'rocket') {
    const data = z
      .object({ success: z.literal(true), message: z.object({ _id: z.string(), rid: z.string() }) })
      .parse(
        JSON.parse(
          await fetchPublic(`${base}/api/v1/chat.getMessage?msgId=${encodeURIComponent(replyId)}`, {
            headers: auth,
          }),
        ),
      );
    if (data.message._id !== replyId || data.message.rid !== connection.roomId)
      throw Error('Reply thread belongs to another room.');
  } else {
    const data = z.object({ id: z.string(), visibility: z.string() }).parse(
      JSON.parse(
        await fetchPublic(`${base}/api/v1/statuses/${encodeURIComponent(replyId)}`, {
          headers: auth,
        }),
      ),
    );
    if (data.id !== replyId || !['public', 'unlisted'].includes(data.visibility))
      throw Error('Only accessible public/unlisted reply targets are supported.');
  }
}
export async function sendProviderPost(
  connection: Connection,
  secret: string,
  body: DraftBody,
  replyId: string,
  attemptId: string,
  identity: WritingIdentity,
) {
  const base = origin(connection),
    auth = headers(connection, secret);
  if (connection.kind === 'rocket') {
    const id = attemptId.replaceAll('-', '');
    const data = z
      .object({
        success: z.literal(true),
        message: z.object({
          _id: z.string().max(500),
          rid: z.string(),
          msg: z.string(),
          u: z.object({ _id: z.string() }),
          tmid: z.string().optional(),
        }),
      })
      .parse(
        JSON.parse(
          await fetchPublic(`${base}/api/v1/chat.sendMessage`, {
            method: 'POST',
            rejectRedirects: true,
            headers: { ...auth, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: {
                _id: id,
                rid: connection.roomId,
                msg: body.text,
                ...(replyId ? { tmid: replyId, tshow: false } : {}),
              },
              previewUrls: [],
            }),
          }),
        ),
      );
    if (
      data.message._id !== id ||
      data.message.rid !== connection.roomId ||
      data.message.u._id !== identity.id ||
      data.message.msg !== body.text ||
      (data.message.tmid ?? '') !== replyId
    )
      throw Error('Provider acknowledgment does not match the reviewed message.');
    return { providerId: data.message._id, url: '' };
  }
  const data = z
    .object({
      id: z.string().min(1).max(500),
      account: z.object({ id: z.string() }),
      visibility: z.string(),
      in_reply_to_id: z.string().nullable(),
      url: z.string().nullable(),
    })
    .parse(
      JSON.parse(
        await fetchPublic(`${base}/api/v1/statuses`, {
          method: 'POST',
          rejectRedirects: true,
          headers: { ...auth, 'Content-Type': 'application/json', 'Idempotency-Key': attemptId },
          body: JSON.stringify({
            status: body.text,
            visibility: body.visibility,
            spoiler_text: body.warning,
            ...(body.language ? { language: body.language } : {}),
            ...(replyId ? { in_reply_to_id: replyId } : {}),
          }),
        }),
      ),
    );
  if (
    data.account.id !== identity.id ||
    data.visibility !== body.visibility ||
    (data.in_reply_to_id ?? '') !== replyId
  )
    throw Error(
      'Provider acknowledgment does not match the reviewed sender, audience or reply target.',
    );
  return { providerId: data.id, url: safeUrl(data.url ?? '') };
}

export async function checkProviderOutcome(
  connection: Connection,
  secret: string,
  body: DraftBody,
  receipt: PostReceipt,
  candidateId: string,
) {
  const base = origin(connection),
    auth = headers(connection, secret);
  if (connection.kind === 'rocket') {
    const account = z
      .object({ _id: z.string() })
      .parse(JSON.parse(await fetchPublic(`${base}/api/v1/me`, { headers: auth })));
    if (account._id !== receipt.senderId || account._id !== connection.posting?.userId)
      throw Error('The writing identity differs from the original attempt.');
    const expectedId = receipt.id.replaceAll('-', '');
    if (candidateId && candidateId !== expectedId)
      throw Error('Use the original client message ID.');
    const result = z
      .object({
        success: z.literal(true),
        message: z.object({
          _id: z.string(),
          rid: z.string(),
          msg: z.string(),
          u: z.object({ _id: z.string() }),
          tmid: z.string().nullable().optional(),
        }),
      })
      .parse(
        JSON.parse(
          await fetchPublic(
            `${base}/api/v1/chat.getMessage?msgId=${encodeURIComponent(expectedId)}`,
            { headers: auth },
          ),
        ),
      );
    const message = result.message;
    if (
      message._id !== expectedId ||
      message.rid !== connection.roomId ||
      message.u._id !== receipt.senderId ||
      message.msg !== body.text ||
      (message.tmid ?? '') !== receipt.replyId
    )
      throw Error('The provider message differs from the original attempt.');
    return { providerId: message._id, url: '' };
  }
  if (!/^\d{1,500}$/.test(candidateId)) throw Error('Supply a local-instance candidate post ID.');
  const account = z
    .object({ id: z.string() })
    .parse(
      JSON.parse(
        await fetchPublic(`${base}/api/v1/accounts/verify_credentials`, { headers: auth }),
      ),
    );
  if (account.id !== receipt.senderId)
    throw Error('The writing identity differs from the original attempt.');
  const result = z
    .object({
      id: z.string(),
      account: z.object({ id: z.string() }),
      visibility: z.string(),
      in_reply_to_id: z.string().nullable(),
      created_at: z.string().datetime(),
      language: z.string().nullable().optional(),
      url: z.string().nullable(),
    })
    .parse(
      JSON.parse(await fetchPublic(`${base}/api/v1/statuses/${candidateId}`, { headers: auth })),
    );
  const source = z
    .object({ id: z.string(), text: z.string().max(5000), spoiler_text: z.string().max(500) })
    .parse(
      JSON.parse(
        await fetchPublic(`${base}/api/v1/statuses/${candidateId}/source`, { headers: auth }),
      ),
    );
  const created = Date.parse(result.created_at),
    attempted = Date.parse(receipt.at);
  if (
    result.id !== candidateId ||
    source.id !== candidateId ||
    result.account.id !== receipt.senderId ||
    source.text !== body.text ||
    source.spoiler_text !== body.warning ||
    result.visibility !== body.visibility ||
    (result.in_reply_to_id ?? '') !== receipt.replyId ||
    (body.language && result.language !== body.language) ||
    created < attempted - 60000 ||
    created > attempted + 10 * 60000
  )
    throw Error(
      'Candidate post does not match the frozen payload, identity, audience, reply and attempt time.',
    );
  return { providerId: result.id, url: safeUrl(result.url ?? '') };
}

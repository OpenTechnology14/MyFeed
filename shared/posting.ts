import { z } from 'zod';
import { LIMITS } from './model';

export const writingIdentitySchema = z.object({
  id: z.string().min(1).max(200),
  username: z.string().min(1).max(200),
  maxCharacters: z.number().int().min(1).max(5000),
  checkedAt: z.string().datetime(),
});
export type WritingIdentity = z.infer<typeof writingIdentitySchema>;
export const postingConfigSchema = z
  .object({
    enabled: z.boolean(),
    version: z.number().int().nonnegative(),
    sourceVersion: z.number().int().positive(),
    userId: z.string().max(120).default(''),
    secret: z.string().max(2000).default(''),
  })
  .strict();
export const postingSettingsSchema = z.object({
  enabled: z.boolean(),
  version: z.number().int().positive(),
  userId: z.string().max(120),
  secretCipher: z.string().optional(),
  identity: writingIdentitySchema.optional(),
});
export type PostingSettings = z.infer<typeof postingSettingsSchema> & { hasSecret?: boolean };
export const draftBodySchema = z
  .object({
    text: z.string().max(5000),
    visibility: z.enum(['public', 'unlisted', 'private']).default('unlisted'),
    warning: z.string().max(500).default(''),
    language: z.union([z.literal(''), z.string().regex(/^[a-z]{2,3}$/)]).default(''),
    replyEntryId: z.string().max(200).default(''),
  })
  .strict();
export type DraftBody = z.infer<typeof draftBodySchema>;
export const DEFAULT_DRAFT_BODY = draftBodySchema.parse({ text: '' });
export const postingDraftSchema = z.object({
  id: z.string().uuid(),
  connectionId: z.string(),
  version: z.number().int().positive(),
  body: draftBodySchema,
  status: z.enum(['draft', 'sending', 'sent', 'unknown']),
  updatedAt: z.string().datetime(),
});
export type PostingDraft = z.infer<typeof postingDraftSchema>;
export const postReceiptSchema = z.object({
  id: z.string().uuid(),
  draftId: z.string().uuid(),
  draftVersion: z.number().int().positive(),
  connectionId: z.string(),
  at: z.string().datetime(),
  kind: z.enum(['rocket', 'mastodon']).optional(),
  status: z.enum(['sending', 'sent', 'failed', 'unknown']),
  sender: z.string().max(200),
  senderId: z.string().max(200).optional(),
  replyId: z.string().max(500).optional(),
  destination: z.string().max(600),
  payloadHash: z.string(),
  providerId: z.string().max(500).optional(),
  url: z
    .string()
    .max(2000)
    .refine((value) => {
      if (!value) return true;
      try {
        const url = new URL(value);
        return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
      } catch {
        return false;
      }
    }, 'Use a safe HTTP(S) provider post URL.')
    .optional(),
  message: z.string().max(500).optional(),
  checkedAt: z.string().datetime().optional(),
  confirmation: z.enum(['send-response', 'provider-lookup']).optional(),
});
export type PostReceipt = z.infer<typeof postReceiptSchema>;
export const outboundSchema = z.object({
  drafts: z.array(postingDraftSchema).max(LIMITS.postingDrafts),
  receipts: z.array(postReceiptSchema).max(LIMITS.postingReceipts),
});
export interface PostingReview {
  token: string;
  expiresAt: string;
  draftId: string;
  draftVersion: number;
  sender: string;
  destination: string;
  body: DraftBody;
  replyId: string;
  maxCharacters: number;
}

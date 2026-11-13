import { z } from 'zod';

const forbidden = new Set(['__proto__', 'prototype', 'constructor']);
const pathSchema = z
  .string()
  .max(240)
  .refine((path) => {
    if (!path) return true;
    const parts = path.split('.');
    return (
      parts.length <= 8 &&
      parts.every((part) => /^[A-Za-z0-9_-]+$/.test(part) && !forbidden.has(part))
    );
  }, 'Use up to eight dot-separated field names, without executable expressions.');
export const apiSourceConfigSchema = z
  .object({
    itemsPath: pathSchema.default('items'),
    idPath: pathSchema.refine(Boolean, 'A stable item ID mapping is required.').default('id'),
    titlePath: pathSchema.default('title'),
    contentPath: pathSchema.default('content'),
    authorPath: pathSchema.default('author'),
    datePath: pathSchema.default('publishedAt'),
    urlPath: pathSchema.default('url'),
    imagePath: pathSchema.default(''),
    tagsPath: pathSchema.default(''),
    type: z.enum(['post', 'article', 'email']).default('post'),
    auth: z.enum(['none', 'bearer', 'header']).default('none'),
    headerName: z
      .string()
      .regex(/^X-[A-Za-z0-9-]{1,60}$/, 'Use an X- prefixed API-key header.')
      .default('X-API-Key'),
    nextCursorPath: pathSchema.default(''),
    cursorParameter: z
      .string()
      .regex(/^[A-Za-z][A-Za-z0-9_-]{0,59}$/)
      .default('cursor'),
    maxPages: z.number().int().min(1).max(3).default(3),
  })
  .strict();
export type ApiSourceConfig = z.infer<typeof apiSourceConfigSchema>;
export const DEFAULT_API_SOURCE = apiSourceConfigSchema.parse({});

export function apiValue(value: unknown, path: string): unknown {
  if (!path) return value;
  for (const part of path.split('.')) {
    if (forbidden.has(part) || !value || typeof value !== 'object' || !Object.hasOwn(value, part))
      return undefined;
    value = (value as Record<string, unknown>)[part];
  }
  return value;
}
export function apiItems(payload: unknown, config: ApiSourceConfig) {
  const items = apiValue(payload, config.itemsPath);
  if (!Array.isArray(items)) throw new Error('API item mapping must select a JSON array.');
  if (items.length > 100)
    throw new Error('API pages must contain at most 100 items. Set a page limit in the endpoint.');
  return items.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item))
      throw new Error('API items must be JSON objects.');
    const id = apiValue(item, config.idPath);
    if (
      !(
        (typeof id === 'string' && id.trim() && id.length <= 500) ||
        (typeof id === 'number' && Number.isSafeInteger(id))
      )
    )
      throw new Error('Each API item needs a stable string or numeric ID.');
    const text = (path: string) => {
      if (!path) return '';
      const value = apiValue(item, path);
      if (value === undefined || value === null) return '';
      if (typeof value !== 'string') throw new Error('Mapped API text fields must be strings.');
      return value;
    };
    const date = text(config.datePath);
    if (date && !Number.isFinite(Date.parse(date)))
      throw new Error('Mapped API publication dates must be valid date strings.');
    const tags = config.tagsPath ? apiValue(item, config.tagsPath) : undefined;
    if (tags !== undefined && (!Array.isArray(tags) || tags.some((tag) => typeof tag !== 'string')))
      throw new Error('Mapped API tags must be an array of strings.');
    return {
      externalId: String(id),
      title: text(config.titlePath),
      content: text(config.contentPath),
      author: text(config.authorPath),
      publishedAt: date || '1970-01-01T00:00:00.000Z',
      url: text(config.urlPath),
      image: text(config.imagePath),
      tags: tags as string[] | undefined,
      type: config.type,
    };
  });
}

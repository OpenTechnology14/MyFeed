import { test, expect } from '@playwright/test';

test('starter → source → read → bookmark → filter → inspect data → new feed', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/feeds');
  await expect(
    page.getByRole('heading', { name: 'Your internet. All in one place.' }),
  ).toBeVisible();
  await page.screenshot({
    path: 'test-results/starter-desktop.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: /Email Newsletters/ }).click();
  await expect(page.getByLabel('IMAP hostname')).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Connect your first source' }).click();
  await page.getByRole('button', { name: /Sample library Example/ }).click();
  await page.getByRole('button', { name: 'Add connection', exact: true }).last().click();
  await page.getByRole('button', { name: 'Linked feeds', exact: true }).click();
  await page.getByRole('checkbox', { name: /My starter feed/ }).click();
  await expect(page.getByRole('checkbox', { name: /My starter feed/ })).toBeChecked();
  await page.getByRole('button', { name: 'Feed view', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'A more personal corner of the internet' }),
  ).toBeVisible();
  await page.screenshot({
    path: 'test-results/reader-desktop.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page
    .getByRole('button', { name: 'Save A more personal corner of the internet', exact: true })
    .click();
  await page
    .locator('.article-preview')
    .filter({ hasText: 'A more personal corner of the internet' })
    .click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(
    page.getByText('Small communities, independent blogs, and open protocols').last(),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Customize filters', exact: true }).click();
  await page.getByLabel('Mute keywords').fill('open web, fediverse');
  await page.getByRole('button', { name: 'Save customization', exact: true }).first().click();
  await expect(page.getByText('Customization saved. Your feed has been updated.')).toBeVisible();
  await page.getByText(/^Filter results ·/).click();
  await expect(page.getByText('Muted keyword: open web').first()).toBeVisible();
  await page.screenshot({
    path: 'test-results/background-desktop.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'Feed view', exact: true }).click();
  await page.getByRole('button', { name: 'Saved', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'A more personal corner of the internet' }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'My starter feed', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Feed view', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'My starter feed' })).toBeVisible();
  await page.getByRole('button', { name: 'Create a feed', exact: true }).last().click();
  await page.getByLabel('Feed name', { exact: true }).fill('Weekend reading');
  await page.getByRole('button', { name: 'Create feed', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Weekend reading' })).toBeVisible();
  await page.getByRole('button', { name: 'Open profile' }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await page.getByLabel('Display name').fill('My Reader');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Changes saved.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open settings' }).click();
  await expect(page.getByRole('heading', { name: 'App settings', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Appearance', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Toggle color theme' }).click();
  await expect(page.locator('html')).toHaveClass('dark');
  await page.getByRole('button', { name: 'Feed view', exact: true }).first().click();
  await page.screenshot({
    path: 'test-results/dark-desktop.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'Toggle color theme' }).click();
  await expect(page.locator('html')).not.toHaveClass('dark');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: 'test-results/starter-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Toggle feed navigation' }).click();
  await page.getByRole('button', { name: 'My starter feed', exact: true }).click();
  await page.screenshot({
    path: 'test-results/reader-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(errors).toEqual([]);
});

test('posts and conversations put collected content first and respect filtering on desktop and mobile', async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const created = await request.post('/api/feeds', { data: { name: 'Posts and conversations' } });
  expect(created.status()).toBe(201);
  const feedId = (await created.json()).createdId as string;
  expect(
    (
      await request.post('/api/connections', {
        data: { feedId, kind: 'sample', name: 'Sample updates' },
      })
    ).status(),
  ).toBe(201);
  expect((await request.post(`/api/feeds/${feedId}/sync`, { data: {} })).status()).toBe(200);
  await page.addInitScript((id) => localStorage.setItem('myfeed-active', id), feedId);
  await page.goto(`/feeds/${feedId}`);
  await expect(page.getByRole('heading', { name: 'Posts and conversations' })).toBeVisible();
  await expect(page.locator('.timeline-entry.post')).toHaveCount(2);
  await expect(page.locator('.conversation-preview')).toHaveCount(2);
  await page.screenshot({
    path: 'test-results/timeline-desktop.png',
    fullPage: true,
    animations: 'disabled',
  });
  await expect(page.getByText('@maya.example', { exact: true })).toBeVisible();
  await expect(page.locator('.article-preview')).toHaveCount(6);
  await expect(page.getByRole('navigation', { name: 'Feed content' })).toHaveCount(0);
  await page
    .locator('.conversation-preview')
    .filter({ hasText: '#weekend-reading' })
    .getByRole('button', { name: /Open conversation/ })
    .click();
  const conversation = page.getByRole('region', { name: 'Conversation in weekend-reading' });
  await expect(conversation.getByRole('heading', { name: '#weekend-reading' })).toBeVisible();
  await expect(conversation.locator('.chat-message-author strong')).toHaveText([
    'Sam Lee',
    'Maya Chen',
    'Jules Park',
  ]);
  await expect(conversation.getByText(/3 collected messages/)).toBeVisible();
  await conversation
    .getByRole('button', { name: 'Mark read: Weekend reading picks', exact: true })
    .click();
  await expect(
    conversation.getByRole('button', { name: 'Mark unread: Weekend reading picks', exact: true }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Unread', exact: true }).click();
  await expect(conversation.locator('.chat-message-author strong')).toHaveText([
    'Maya Chen',
    'Jules Park',
  ]);
  await page.getByRole('button', { name: 'Unread', exact: true }).click();
  await expect(conversation.locator('.chat-message')).toHaveCount(3);
  await page.screenshot({
    path: 'test-results/chats-desktop.png',
    fullPage: true,
    animations: 'disabled',
  });
  await conversation
    .getByRole('button', { name: 'Save A recommendation from Maya', exact: true })
    .click();
  await expect(
    conversation.getByRole('button', { name: 'Unsave A recommendation from Maya', exact: true }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Back to feed', exact: true }).click();
  await page.getByRole('button', { name: 'Search feed', exact: true }).click();
  await page.getByLabel('Search posts, people, and conversations').fill('lose the noise');
  await page.getByRole('button', { name: 'Show results', exact: true }).click();
  await expect(page.locator('.conversation-preview')).toHaveCount(1);
  await page
    .locator('.conversation-preview')
    .getByRole('button', { name: /Open conversation/ })
    .click();
  await expect(page.getByRole('region', { name: 'Conversation in general' })).toContainText(
    'Keep the conversations, lose the noise.',
  );
  await expect(page.locator('.chat-message')).toHaveCount(1);
  await page.getByRole('button', { name: 'Back to feed', exact: true }).click();
  await page.getByRole('button', { name: 'Clear search', exact: true }).click();

  const state = await (await request.get('/api/state')).json();
  const { id, createdAt, digest, ...config } = state.feeds.find(
    (f: { id: string }) => f.id === feedId,
  );
  expect(
    (
      await request.patch(`/api/feeds/${id}`, {
        data: { ...config, exclude: ['small community'], revision: state.revision },
      })
    ).status(),
  ).toBe(200);
  await page.reload();
  await page
    .locator('.conversation-preview')
    .filter({ hasText: '#weekend-reading' })
    .getByRole('button', { name: /Open conversation/ })
    .click();
  await expect(conversation.locator('.chat-message-author strong')).toHaveText([
    'Sam Lee',
    'Jules Park',
  ]);
  await expect(conversation.getByText(/writing for a small community/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Feed view', exact: true }).click();
  await page.getByRole('button', { name: 'Saved', exact: true }).click();
  await page
    .locator('.conversation-preview')
    .filter({ hasText: '#weekend-reading' })
    .getByRole('button', { name: /Open conversation/ })
    .click();
  await expect(conversation.locator('.chat-message-author strong')).toHaveText(['Maya Chen']);
  await expect(conversation.getByText(/writing for a small community/)).toBeVisible();
  await page.getByRole('button', { name: 'Saved', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .locator('.conversation-preview')
    .filter({ hasText: '#weekend-reading' })
    .getByRole('button', { name: /Open conversation/ })
    .click();
  await expect(conversation).toBeVisible();
  await expect(page.locator('.conversation-preview')).toHaveCount(0);
  await page.screenshot({
    path: 'test-results/chats-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Back to feed' }).click();
  await expect(page.locator('.conversation-preview')).toHaveCount(2);
  await expect(conversation).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('live local history, editor and AI review use bounded reads without automatic spending', async ({
  page,
}) => {
  const read = async () => {
    const result = await page.request.get('/api/state');
    return result.json();
  };
  let state = await read();
  const feedId = state.feeds[0].id;
  const linked = () =>
    state.connections.filter((c: { feedIds?: string[]; feedId?: string }) =>
      (c.feedIds ?? [c.feedId]).includes(feedId),
    );
  while (linked().length < 3) {
    const response = await page.request.post('/api/connections', {
      data: { kind: 'sample', name: `Paging fixture ${linked().length}`, feedIds: [feedId] },
    });
    expect(response.status()).toBe(201);
    state = await response.json();
  }
  for (const source of linked()) {
    await page.request.post(`/api/connections/${source.id}/sync`, { data: {} });
  }
  state = await read();
  const feed = state.feeds.find((f: { id: string }) => f.id === feedId);
  await page.request.patch(`/api/feeds/${feedId}`, {
    data: { ...feed, include: [], exclude: [], deduplicate: false, revision: state.revision },
  });
  await page.goto(`/feeds/${feedId}`);
  await expect(
    page.getByRole('button', { name: 'Load more matching items', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Load more matching items', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Load more matching items', exact: true }),
  ).not.toBeVisible();
  const post = page.locator('.timeline-entry.post').first();
  await post.getByRole('button', { name: /Edit local copy:/ }).click();
  await expect(page.getByRole('dialog', { name: 'Edit local copy' })).toBeVisible();
  await page.getByLabel('Local body', { exact: true }).fill('Local persistence 🧭');
  await page.getByRole('button', { name: 'Save local copy', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('dialog', { name: 'Edit local copy' })).toBeVisible();
  await expect(page.getByLabel('Local body', { exact: true })).toHaveValue('Local persistence 🧭');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.request.put('/api/ai', {
    data: { model: 'fixture-model-not-live', secret: 'fixture-key-not-live' },
  });
  await page.goto(`/feeds/${feedId}`);
  await page.getByRole('button', { name: 'Generate digest', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Review digest generation' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Count tokens and generate', exact: true }),
  ).toBeEnabled();
  await page.route('**/api/feeds/*/digest-plan?**', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Review temporarily unavailable.' }),
    }),
  );
  await page.getByRole('spinbutton', { name: 'Maximum input items', exact: true }).fill('19');
  await expect(page.getByRole('alert')).toHaveText('Review temporarily unavailable.');
  await expect(
    page.getByRole('button', { name: 'Count tokens and generate', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.unroute('**/api/feeds/*/digest-plan?**');
  state = await read();
  expect(state.ai.receipts ?? []).toHaveLength(0);
  expect(state.feeds.find((f: { id: string }) => f.id === feedId).digest).toBeUndefined();
  await page.request.put('/api/ai', { data: { disconnect: true } });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/paged-history-mobile.png' });
});

test('release limits, pause/background persistence and removal confirmation are explicit', async ({
  page,
}) => {
  let state = await (await page.request.get('/api/state')).json();
  await page.goto(`/feeds/${state.feeds[0].id}`);
  while (state.feeds.length < 5) {
    await page.getByRole('button', { name: 'Create a feed', exact: true }).click();
    await page.getByLabel('Feed name', { exact: true }).fill(`Release lens ${state.feeds.length}`);
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Create feed', exact: true })
      .click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    state = await (await page.request.get('/api/state')).json();
  }
  await expect(page.getByRole('button', { name: 'Create a feed', exact: true })).toBeDisabled();
  const response = await page.request.post('/api/connections', {
    data: { kind: 'sample', name: 'Removal fixture' },
  });
  state = await response.json();
  const source = state.connections.at(-1);
  await page.goto(`/connections?tab=${source.id}`);
  const firstFeed = state.feeds[0];
  await expect(
    page.locator('.connection-feed-row').filter({ hasText: firstFeed.name }).getByRole('checkbox'),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Refresh connection', exact: true }).click();
  await page.getByRole('switch', { name: 'Connection enabled', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Refresh connection', exact: true }),
  ).toBeDisabled();
  await page.getByRole('switch', { name: 'Background sync', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('switch', { name: 'Background sync', exact: true })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await expect(
    page.getByRole('switch', { name: 'Connection enabled', exact: true }),
  ).toHaveAttribute('aria-checked', 'false');
  await page.getByRole('button', { name: 'Remove connection', exact: true }).click();
  await page.getByRole('button', { name: 'Keep it', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Removal fixture', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Remove connection', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Remove', exact: true }).click();
  state = await (await page.request.get('/api/state')).json();
  expect(state.connections.some((c: { id: string }) => c.id === source.id)).toBe(false);
  expect(state.entries.some((e: { connectionId: string }) => e.connectionId === source.id)).toBe(
    false,
  );
});

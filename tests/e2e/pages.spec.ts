import { test, expect } from '@playwright/test';

const layouts = [
  { path: 'connections', title: 'Connections' },
  { path: 'feed', title: 'Daily perspective' },
  { path: 'customize', title: 'Feed customization' },
  { path: 'profile', title: 'Your profile' },
  { path: 'settings', title: 'App settings' },
];

test('isolated page previews support sidebar navigation, review edits, reload, and mobile layouts', async ({
  page,
  request,
}) => {
  const before = await (await request.get('/api/state')).json();
  const apiRequests: string[] = [],
    errors: string[] = [];
  page.on('request', (r) => {
    if (new URL(r.url()).pathname.startsWith('/api/')) apiRequests.push(r.url());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  for (const layout of layouts) {
    await page.goto(`/preview/${layout.path}`);
    await expect(
      page.getByRole('heading', { name: layout.title, exact: true, level: 1 }),
    ).toBeVisible();
    await expect(page.locator('.preview-note')).toContainText('fictional sample data');
    await expect(page.locator('.preview-review-bar, .feed-directory')).toHaveCount(0);
    await expect(
      page.locator('.workspace-header, .page-heading, .workspace-tabs, .new-feed-card'),
    ).toHaveCount(0);
    await expect(
      page.locator('main').getByRole('button', { name: 'Create a feed', exact: true }),
    ).toHaveCount(0);
    await page.screenshot({
      path: `test-results/page-${layout.path}-desktop.png`,
      fullPage: true,
      animations: 'disabled',
    });
  }
  await page.getByRole('button', { name: 'Daily perspective', exact: true }).click();
  await expect(page.locator('.timeline-entry.post')).toHaveCount(2);
  await page
    .getByRole('group', { name: 'Feed mode' })
    .getByRole('button', { name: 'Customize filters', exact: true })
    .click();
  await page.goBack();
  await expect(page.locator('.timeline-entry.post')).toHaveCount(2);
  await page.goForward();
  await page.getByLabel('Mute keywords').fill('small blog');
  await page.getByRole('button', { name: 'Save customization', exact: true }).first().click();
  await expect(page.getByText('Customization saved. Your feed has been updated.')).toBeVisible();
  await page.getByRole('button', { name: 'Feed view', exact: true }).click();
  await expect(page.locator('.timeline-entry.post')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.timeline-entry.post')).toHaveCount(2);
  await page.getByRole('button', { name: 'Open profile', exact: true }).click();
  await page.getByLabel('Display name').fill('Review Reader');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.locator('.profile-summary-card h3')).toHaveText('Review Reader');
  await page.getByRole('button', { name: 'Open settings', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Appearance', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Toggle color theme' }).click();
  await expect(page.locator('html')).toHaveClass('dark');
  await page.reload();
  await expect(page.locator('html')).not.toHaveClass('dark');
  await page.getByRole('button', { name: 'AI provider', exact: true }).click();
  await expect(page.getByLabel('OpenAI API key')).toBeDisabled();
  await expect(page.getByLabel('Model ID')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Feed view', exact: true }).click();
  await page.getByRole('button', { name: /^Connections/ }).click();
  await page.getByRole('button', { name: 'Add connection', exact: true }).click();
  await expect(page.getByRole('button', { name: /Rocket.Chat Messages/ })).toBeDisabled();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  for (const layout of layouts) {
    await page.goto(`/preview/${layout.path}`);
    await expect(
      page.getByRole('heading', { name: layout.title, exact: true, level: 1 }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/page-${layout.path}-mobile.png`,
      fullPage: true,
      animations: 'disabled',
    });
  }
  expect(apiRequests).toEqual([]);
  expect(errors).toEqual([]);
  expect(await (await request.get('/api/state')).json()).toEqual(before);
});

test('real page URLs keep the starter workspace available after reload', async ({ page }) => {
  await page.goto('/feeds');
  await expect(page.getByRole('heading', { name: 'My starter feed', exact: true })).toBeVisible();
  await page
    .getByRole('group', { name: 'Feed mode' })
    .getByRole('button', { name: 'Customize filters', exact: true })
    .click();
  await expect(page).toHaveURL(/\/feeds\/[^/]+\/customize$/);
  await expect(
    page.getByRole('heading', { name: 'Feed customization', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Feed name', { exact: true })).toHaveValue('My starter feed');
  await page.getByRole('button', { name: 'Open profile', exact: true }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByLabel('Display name')).toBeVisible();
  await page.getByRole('button', { name: 'Open settings', exact: true }).click();
  await expect(page).toHaveURL(/\/settings\?tab=ai$/);
  await expect(page.getByRole('heading', { name: 'App settings', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Your profile', exact: true })).toBeVisible();
});

test('connection data supplies multiple feeds and sidebar modes retain the selected feed', async ({
  page,
  request,
}) => {
  const before = await (await request.get('/api/state')).json();
  const requests: string[] = [];
  page.on('request', (r) => {
    if (new URL(r.url()).pathname.startsWith('/api/')) requests.push(r.url());
  });
  await page.goto('/preview/connections?tab=preview-source-0');
  await page.getByRole('button', { name: 'Open post log for Sample library', exact: true }).click();
  await expect(page.locator('.collected-items details')).toHaveCount(13);
  await page.getByRole('button', { name: 'Close post log' }).click();
  await page.getByRole('button', { name: 'Linked feeds', exact: true }).click();
  const link = page.getByRole('checkbox', { name: /Design & ideas/ });
  await link.click();
  await expect(link).toBeChecked();
  await page.getByRole('button', { name: 'Design & ideas', exact: true }).click();
  await expect(page.locator('.timeline-entry.post')).toHaveCount(2);
  await page
    .getByRole('group', { name: 'Feed mode' })
    .getByRole('button', { name: 'Customize filters', exact: true })
    .click();
  await expect(page.getByLabel('Feed name', { exact: true })).toHaveValue('Design & ideas');
  const source = page.getByRole('checkbox', { name: /^Sample library/ });
  await source.click();
  await expect(source).not.toBeChecked();
  await page.getByRole('button', { name: 'Feed view', exact: true }).click();
  await expect(page.locator('.timeline-entry.post')).toHaveCount(0);
  await page.getByRole('button', { name: /^Connections/ }).click();
  await page.getByRole('button', { name: /^Sample library/ }).click();
  await page.getByRole('button', { name: 'Open post log for Sample library', exact: true }).click();
  await expect(page.locator('.collected-items details')).toHaveCount(13);
  await page.getByRole('button', { name: 'Close post log' }).click();
  await page.getByRole('switch', { name: 'Background sync', exact: true }).click();
  await expect(page.getByRole('switch', { name: 'Background sync', exact: true })).toBeChecked();
  await page.screenshot({ path: 'test-results/connections-desktop.png', fullPage: true });
  await page
    .getByRole('group', { name: 'Feed mode' })
    .getByRole('button', { name: 'Customize filters', exact: true })
    .click();
  await expect(page.getByLabel('Feed name', { exact: true })).toHaveValue('Design & ideas');
  await page.getByRole('button', { name: 'Team conversations', exact: true }).click();
  await expect(page.getByLabel('Feed name', { exact: true })).toHaveValue('Team conversations');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Toggle feed navigation' }).click();
  await expect(page.getByRole('button', { name: 'Create a feed', exact: true })).toBeVisible();
  await expect(
    page.locator('.sidebar').getByRole('button', { name: 'App settings', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: 'test-results/sidebar-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Feed view', exact: true }).click();
  await expect(page).toHaveURL(/preview\/feed\?feed=33333333/);
  await expect(page.locator('.sidebar')).not.toBeVisible();
  await page.goto('/preview/connections');
  await page.screenshot({ path: 'test-results/connections-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(requests).toEqual([]);
  expect(await (await request.get('/api/state')).json()).toEqual(before);
});

test('one mixed feed supports popup search, configured mention summaries, and expandable source data', async ({
  page,
  request,
}) => {
  const before = await (await request.get('/api/state')).json();
  const calls: string[] = [];
  page.on('request', (r) => {
    if (new URL(r.url()).pathname.startsWith('/api/')) calls.push(r.url());
  });
  await page.goto('/preview/feed');
  await expect(
    page.locator(
      '.feed-mode-tabs, .reader-toolbar, .workspace-select, .preview-review-bar, .feed-directory',
    ),
  ).toHaveCount(0);
  await expect(page.getByRole('combobox')).toHaveCount(0);
  await expect(page.getByText('Latest first', { exact: true })).toHaveCount(0);
  const order = await page.locator('.sidebar-section-heading').allTextContents();
  expect(order.indexOf('MY FEEDS')).toBeLessThan(order.indexOf('FEED MODE'));
  const positions = await page.locator('.social-timeline > article').evaluateAll((items) =>
    items.slice(0, 2).map((el) => ({
      top: el.getBoundingClientRect().top,
      bottom: el.getBoundingClientRect().bottom,
    })),
  );
  expect(positions[1].top - positions[0].bottom).toBeGreaterThanOrEqual(12);
  await page.getByRole('button', { name: 'Search feed', exact: true }).click();
  const input = page.getByLabel('Search posts, people, and conversations');
  await expect(input).toBeFocused();
  expect((await page.getByRole('dialog').boundingBox())!.y).toBeLessThan(60);
  await input.fill('small blog');
  await page.getByRole('button', { name: 'Show results', exact: true }).click();
  await expect(page.locator('.timeline-entry')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Search feed', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Clear search', exact: true }).click();
  await page.getByRole('button', { name: 'Alerts (1 unread)', exact: true }).click();
  await expect(page.locator('.mention-alerts article')).toHaveCount(1);
  expect((await page.locator('.mention-alerts p').innerText()).length).toBeLessThanOrEqual(181);
  await page.screenshot({
    path: 'test-results/alerts-desktop.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'Open tagged post', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('@alex');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await expect(page.getByRole('button', { name: 'Alerts (0 unread)', exact: true })).toBeVisible();
  await page
    .getByRole('group', { name: 'Feed mode' })
    .getByRole('button', { name: 'Customize filters', exact: true })
    .click();
  await page.getByRole('switch', { name: 'Show mention alerts', exact: true }).click();
  await page.getByRole('button', { name: 'Save customization', exact: true }).first().click();
  await page.getByRole('button', { name: 'Feed view', exact: true }).click();
  await page.getByRole('button', { name: 'Alerts (0 unread)', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Configure alerts', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Configure alerts', exact: true }).click();
  await page.getByRole('button', { name: 'Configure local alerts and feed', exact: true }).click();
  await page.getByRole('switch', { name: 'Show mention alerts', exact: true }).click();
  await page.getByLabel('Your @handles').fill('@alex');
  await page.getByLabel('Mute keywords').fill('@alex');
  await page.getByRole('button', { name: 'Save customization', exact: true }).first().click();
  await page.getByRole('button', { name: 'Feed view', exact: true }).click();
  await page.getByRole('button', { name: 'Alerts (0 unread)', exact: true }).click();
  await expect(page.getByText('No mentions in this feed yet.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: /^Connections/ }).click();
  await expect(page.locator('.collected-item')).toHaveCount(0);
  await page.getByRole('button', { name: 'Open post log for Sample library', exact: true }).click();
  const item = page.locator('.collected-item').first();
  await expect(item.locator(':scope > p')).not.toBeVisible();
  await item.locator('summary').click();
  await expect(item.locator(':scope > p')).toBeVisible();
  await item.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(item.getByRole('button', { name: 'Unsave', exact: true })).toBeVisible();
  await item.locator('summary').click();
  await item.locator('summary').click();
  await expect(item.getByRole('button', { name: 'Unsave', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close post log' }).click();
  await page.getByRole('button', { name: 'Open settings', exact: true }).click();
  await page.locator('.workspace-settings summary').click();
  await expect(page.locator('.workspace-settings')).toContainText('Personal workspace');
  await page.goto('/preview/feed');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Search feed', exact: true }).click();
  await page.screenshot({
    path: 'test-results/search-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Search feed', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Alerts (1 unread)', exact: true }).click();
  await page.screenshot({
    path: 'test-results/alerts-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(calls).toEqual([]);
  expect(await (await request.get('/api/state')).json()).toEqual(before);
});

test('each connection expands its own post log, closed by default', async ({ page }) => {
  await page.goto('/preview/connections');
  await expect(page.locator('.collected-item')).toHaveCount(0);
  for (const [name, count] of [
    ['Sample library', 13],
    ['Sample reading', 6],
    ['Sample chats', 5],
  ] as const) {
    const button = page.getByRole('button', { name: `Open post log for ${name}`, exact: true });
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await button.click();
    const log = page.getByRole('region', { name: `${name} post log`, exact: true });
    await expect(log).toBeVisible();
    await expect(log.locator('.collected-item')).toHaveCount(count);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await button.click();
    await expect(log).toHaveCount(0);
    await expect(button).toHaveAttribute('aria-expanded', 'false');
  }
  await page.reload();
  await expect(page.locator('.connection-post-log')).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Open post log for Sample chats', exact: true }).click();
  const log = page.getByRole('region', { name: 'Sample chats post log', exact: true });
  await expect(log.locator('.collected-item')).toHaveCount(5);
  await log.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: 'test-results/post-log-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('reader refresh, settings connections, and left-side mobile navigation', async ({ page }) => {
  await page.goto('/preview/feed');
  await expect(page.locator('.sidebar').getByRole('button', { name: 'Refresh feed' })).toHaveCount(
    0,
  );
  await page.locator('.feed-topline').getByRole('button', { name: 'Refresh feed' }).click();
  await expect(
    page.locator('.feed-topline').getByRole('button', { name: 'Refresh feed' }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Open settings', exact: true }).click();
  await page
    .locator('.settings-page-layout')
    .getByRole('button', { name: 'Connections', exact: true })
    .click();
  await expect(page).toHaveURL(/\/preview\/connections/);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/preview/feed');
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const name of [
      'MyFeed home',
      'Search feed',
      'Toggle color theme',
      'Open settings',
      'Open profile',
      'Toggle feed navigation',
    ]) {
      const control = page.getByRole('button', { name, exact: true });
      await expect(control).toBeVisible();
      const position = await control.boundingBox();
      expect(position!.y).toBeLessThan(58);
      expect(position!.x).toBeGreaterThanOrEqual(0);
      expect(position!.x + position!.width).toBeLessThanOrEqual(width);
    }
  }
  await page.getByRole('button', { name: 'Open settings', exact: true }).click();
  await expect(page).toHaveURL(/\/preview\/settings/);
  await page.getByRole('button', { name: 'Open profile', exact: true }).click();
  await expect(page).toHaveURL(/\/preview\/profile/);
  await page.getByRole('button', { name: 'MyFeed home', exact: true }).click();
  await expect(
    page.locator('.icon-rail').getByRole('button', { name: /Help|Workspace guide/ }),
  ).toHaveCount(0);
  const menu = page.getByRole('button', { name: 'Toggle feed navigation' });
  const box = await menu.boundingBox();
  const homeBox = await page
    .getByRole('button', { name: 'MyFeed home', exact: true })
    .boundingBox();
  expect(box!.x).toBe(16);
  expect(box!.x + box!.width).toBeLessThan(homeBox!.x);
  expect(Math.round(homeBox!.x + homeBox!.width)).toBe(374);
  expect(box!.y).toBeLessThan(30);
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  const sidebar = await page.locator('.sidebar').boundingBox();
  expect(sidebar!.x).toBe(0);
  const profileRow = page.locator('.sidebar .profile-row');
  const profilePosition = await profileRow.boundingBox();
  const feedsPosition = await page.locator('.feed-navigation').boundingBox();
  expect(profilePosition!.y + profilePosition!.height).toBeLessThan(feedsPosition!.y);
  await page.screenshot({ path: 'test-results/mobile-left-menu.png' });
  await profileRow.click();
  await expect(page).toHaveURL(/\/preview\/profile/);
  await expect(page.locator('.sidebar')).not.toBeVisible();
  await menu.click();
  await page.locator('.sidebar').getByRole('button', { name: 'Help', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Open settings', exact: true }).click();
  await page
    .locator('.settings-page-layout')
    .getByRole('button', { name: 'Help', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await menu.click();

  await page
    .locator('.sidebar')
    .getByRole('button', { name: /^Connections/ })
    .click();
  await expect(page.locator('.sidebar')).not.toBeVisible();
  await page.goto('/preview/feed');
  await expect(
    page.locator('.feed-topline').getByRole('button', { name: 'Refresh feed' }),
  ).toBeVisible();
  await page.screenshot({ path: 'test-results/mobile-reader-controls.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('per-feed text limits shorten previews while full text and saved search stay accessible', async ({
  page,
}) => {
  await page.goto('/preview/customize');
  await page.getByLabel('Item text limit', { exact: true }).selectOption('words');
  await page.getByLabel('Maximum words per item', { exact: true }).fill('3');
  await page.getByRole('button', { name: 'Save customization', exact: true }).first().click();
  await expect(page.getByText('Customization saved. Your feed has been updated.')).toBeVisible();
  await page
    .getByRole('group', { name: 'Feed mode' })
    .getByRole('button', { name: 'Feed view', exact: true })
    .click();
  const post = page.locator('.timeline-entry.post').filter({ hasText: 'Maya Chen' }).first();
  await expect(post.locator('.post-body')).toHaveText('The most interesting…');
  await post.getByRole('button', { name: 'Show more', exact: true }).click();
  await expect(post.locator('.post-body')).toContainText('A small blog');
  await post.getByRole('button', { name: 'Show less', exact: true }).click();
  await post.getByRole('button', { name: /^Save / }).click();
  await page.getByRole('button', { name: 'Saved', exact: true }).first().click();
  await expect(post.locator('.post-body')).toHaveText('The most interesting…');
  await page.getByRole('button', { name: 'Search feed', exact: true }).click();
  await page.getByLabel('Search posts, people, and conversations').fill('small blog');
  await page.getByRole('button', { name: 'Show results', exact: true }).click();
  await expect(post).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/text-limit-mobile.png' });
  await page.reload();
  await expect(
    page
      .locator('.timeline-entry.post')
      .filter({ hasText: 'Maya Chen' })
      .first()
      .locator('.post-body'),
  ).toContainText('A small blog');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .getByRole('group', { name: 'Feed mode' })
    .getByRole('button', { name: 'Customize filters', exact: true })
    .click();
  await page.getByLabel('Item text limit', { exact: true }).selectOption('characters');
  await page.getByLabel('Maximum characters per item', { exact: true }).fill('5');
  await page.getByRole('button', { name: 'Save customization', exact: true }).first().click();
  await page
    .getByRole('group', { name: 'Feed mode' })
    .getByRole('button', { name: 'Feed view', exact: true })
    .click();
  const article = page.locator('.article-preview').first();
  const excerpt = await article.locator('p').textContent();
  expect(excerpt!.length).toBe(6);
  expect(excerpt!.endsWith('…')).toBe(true);
  await article.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect((await page.getByRole('dialog').textContent())!.length).toBeGreaterThan(100);
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  const chat = page.locator('.conversation-preview').first();
  for (const text of await chat
    .locator('.conversation-preview-messages p > span')
    .allTextContents()) {
    expect(text.length).toBeLessThanOrEqual(6);
  }
  await chat.locator('.open-conversation').click();
  expect((await page.locator('.conversation-panel').textContent())!.length).toBeGreaterThan(100);
  await page.screenshot({ path: 'test-results/text-limit-conversation.png' });
});

test('drafts survive navigation and history, and missing routes have recovery', async ({
  page,
}) => {
  await page.goto('/preview/customize');
  await page.getByLabel('Feed name', { exact: true }).fill('Unsaved lens');
  await page.getByRole('button', { name: 'Open profile', exact: true }).click();
  await page.getByLabel('Display name').fill('Unsaved person');
  await page.goBack();
  await expect(page.getByLabel('Feed name', { exact: true })).toHaveValue('Unsaved lens');
  await page.getByRole('button', { name: 'Discard customization draft' }).click();
  await expect(page.getByLabel('Feed name', { exact: true })).toHaveValue('Daily perspective');
  await page.goForward();
  await expect(page.getByLabel('Display name')).toHaveValue('Unsaved person');
  await page.getByRole('button', { name: 'Discard profile draft' }).click();
  await expect(page.getByLabel('Display name')).toHaveValue('Alex Morgan');
  await page.goto('/preview/feed?feed=missing');
  await expect(page.getByRole('heading', { name: 'Feed not found' })).toBeVisible();
  await page.getByRole('button', { name: 'Open first feed' }).click();
  await expect(page.locator('.feed-topline')).toBeVisible();
  await page.goto('/preview/not-a-page');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Toggle feed navigation' }).click();
  await expect(page.locator('.sidebar .profile-row')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('.sidebar')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Toggle feed navigation' })).toBeFocused();
});

test('connection editor retains collected data and check records read-only health', async ({
  page,
}) => {
  await page.goto('/preview/connections');
  await page.getByRole('button', { name: 'Edit connection', exact: true }).click();
  await page.getByLabel('Connection name', { exact: true }).fill('Renamed sample');
  await page.getByRole('button', { name: 'Save connection', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Renamed sample', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Check connection', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Read succeeded: 13 items available');
  await page.getByRole('button', { name: 'Open post log for Renamed sample', exact: true }).click();
  await expect(page.locator('.collected-item')).toHaveCount(13);
});

test('API setup and default AI Pipeline configuration persist without provider calls', async ({
  page,
}) => {
  await page.route('**/api/connections/*/sync', async (route) => {
    const state = await (await page.request.get('/api/state')).json();
    await route.fulfill({ status: 200, json: state });
  });
  await page.goto('/connections');
  await page.getByRole('button', { name: 'Add connection', exact: true }).first().click();
  await page.getByRole('button', { name: /API source Read-only JSON/ }).click();
  await page.getByLabel('API endpoint', { exact: true }).fill('https://api.example.com/feed');
  await page.getByLabel('Connection name', { exact: true }).fill('External pipeline fixture');
  await page.getByLabel('API authentication', { exact: true }).selectOption('header');
  await page.getByLabel('API-key header name', { exact: true }).fill('X-Reader-Key');
  await page.getByLabel('API credential', { exact: true }).fill('fictional-browser-token');
  await page.getByLabel('Items path', { exact: true }).fill('data.items');
  await page.getByLabel('Stable ID path', { exact: true }).fill('uid');
  await page.getByLabel('Next cursor path', { exact: true }).fill('data.next');
  await page.getByRole('button', { name: 'Add connection', exact: true }).last().click();
  await expect(
    page.getByRole('heading', { name: 'External pipeline fixture', exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Edit connection', exact: true }).click();
  await expect(page.getByLabel('Items path', { exact: true })).toHaveValue('data.items');
  await expect(page.getByLabel('Stable ID path', { exact: true })).toHaveValue('uid');
  await expect(page.getByLabel('API credential', { exact: true })).toHaveValue('');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Configure pipeline profile', exact: true }).click();
  await page
    .getByLabel('Pipeline processing instructions', { exact: true })
    .fill('Summarize in short topic groups.');
  await page.getByRole('button', { name: 'Save customization', exact: true }).first().click();
  await page.reload();
  await expect(page.getByLabel('Pipeline processing instructions', { exact: true })).toHaveValue(
    'Summarize in short topic groups.',
  );
  await page
    .getByRole('button', { name: /^Connections/ })
    .first()
    .click();
  await expect(
    page.getByRole('button', { name: 'Review AI Pipeline', exact: true }),
  ).toBeDisabled();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/pipeline-connections-mobile.png', fullPage: true });
  let workspaceCalls = 0;
  page.on('request', (request) => {
    if (request.url().includes('/api/')) workspaceCalls++;
  });
  await page.goto('/preview/customize');
  await page
    .getByLabel('Pipeline processing instructions', { exact: true })
    .fill('Fictional preview preferences');
  await page.getByRole('button', { name: 'Save customization', exact: true }).first().click();
  await page.reload();
  await expect(page.getByLabel('Pipeline processing instructions', { exact: true })).toHaveValue(
    '',
  );
  expect(workspaceCalls).toBe(0);
});

test('fictional posting preview supports drafts, audience review and simulated send without workspace requests', async ({
  page,
}) => {
  let calls = 0;
  page.on('request', (request) => {
    if (request.url().includes('/api/')) calls++;
  });
  await page.goto('/preview/connections');
  await page.getByRole('button', { name: 'Check writing account', exact: true }).click();
  await page.getByRole('button', { name: 'New message', exact: true }).click();
  await page.getByLabel('Message text', { exact: true }).fill('Fictional review text, never sent.');
  await page.getByLabel('Post audience', { exact: true }).selectOption('private');
  await page.getByLabel('Content warning', { exact: true }).fill('Preview warning');
  await page.getByRole('button', { name: 'Save local draft', exact: true }).click();
  await page.getByRole('button', { name: 'Review send', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('fictional.writer');
  await expect(page.getByRole('dialog')).toContainText('Fictional server · private');
  await page.getByRole('button', { name: 'Simulate send', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Preview simulation only. Nothing was sent.' }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/posting-preview-mobile.png', fullPage: true });
  await page
    .getByRole('heading', { name: 'Fictional posting preview', exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/posting-controls-mobile.png' });
  await page.getByRole('button', { name: 'New message', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Compose message', exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/posting-composer-mobile.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Open draft', exact: true })).toHaveCount(0);
  expect(calls).toBe(0);
});

test('mocked posting UI preserves encrypted setup/drafts and reviews the exact target before send', async ({
  page,
}) => {
  let writerId = '';
  let simulated: string | undefined;
  let simulatedStatus: 'unknown' | 'sent' = 'unknown';
  let submissions = 0,
    outcomeChecks = 0;
  function decorated(state: any) {
    const c = state.connections.find((item: any) => item.id === writerId);
    if (c?.posting?.enabled)
      c.posting.identity = {
        id: 'fixture-writer',
        username: 'fixture.writer',
        maxCharacters: 500,
        checkedAt: new Date().toISOString(),
      };
    if (simulated && state.outbound) {
      const d = state.outbound.drafts.find((item: any) => item.id === simulated);
      if (d) d.status = simulatedStatus;
      state.outbound.receipts = [
        {
          id: '77777777-7777-4777-8777-777777777777',
          draftId: simulated,
          draftVersion: d?.version ?? 1,
          connectionId: writerId,
          status: simulatedStatus,
          at: new Date().toISOString(),
          sender: 'fixture.writer',
          senderId: 'fixture-writer',
          replyId: '',
          kind: 'mastodon',
          destination: 'https://social.example.com · private',
          payloadHash: 'browser-fixture',
          providerId: simulatedStatus === 'sent' ? '12345' : undefined,
          message:
            simulatedStatus === 'sent'
              ? 'Mocked read-only lookup confirmed; nothing resent.'
              : 'Mocked unknown outcome; nothing sent.',
        },
      ];
    }
    return state;
  }
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/sync') || path.endsWith('/posting/check')) {
      const state = await (await page.request.get('/api/state')).json();
      await route.fulfill({ status: 200, json: decorated(state) });
      return;
    }
    if (path.endsWith('/review')) {
      const state = decorated(await (await page.request.get('/api/state')).json());
      const id = path.split('/').at(-2);
      const d = state.outbound.drafts.find((item: any) => item.id === id);
      await route.fulfill({
        status: 200,
        json: {
          token: '77777777-7777-4777-8777-777777777777',
          expiresAt: new Date(Date.now() + 300000).toISOString(),
          draftId: d.id,
          draftVersion: d.version,
          sender: 'fixture.writer',
          destination: 'https://social.example.com · ' + d.body.visibility,
          body: d.body,
          replyId: '',
          maxCharacters: 500,
        },
      });
      return;
    }
    if (path.endsWith('/send')) {
      submissions++;
      simulated = path.split('/').at(-2);
      await route.fulfill({
        status: 200,
        json: decorated(await (await page.request.get('/api/state')).json()),
      });
      return;
    }
    if (path.includes('/outbound/receipts/') && path.endsWith('/check')) {
      outcomeChecks++;
      simulatedStatus = 'sent';
      await route.fulfill({
        status: 200,
        json: decorated(await (await page.request.get('/api/state')).json()),
      });
      return;
    }
    const response = await route.fetch();
    if (path === '/api/state' || path.includes('/posting') || path.includes('/outbound/drafts'))
      await route.fulfill({ response, json: decorated(await response.json()) });
    else await route.fulfill({ response });
  });
  await page.goto('/connections');
  await page.getByRole('button', { name: 'Add connection', exact: true }).first().click();
  await page.getByRole('button', { name: /Fediverse Public Mastodon/ }).click();
  await page.getByLabel('Connection name', { exact: true }).fill('Posting browser fixture');
  await page.getByLabel('Mastodon server', { exact: true }).fill('https://social.example.com');
  await page.getByRole('button', { name: 'Add connection', exact: true }).last().click();
  await expect(
    page.getByRole('heading', { name: 'Posting browser fixture', exact: true }),
  ).toBeVisible();
  const raw = await (await page.request.get('/api/state')).json();
  writerId = raw.connections.find((c: any) => c.name === 'Posting browser fixture').id;
  await page.reload();
  await page.getByText('Configure writing account', { exact: true }).click();
  await page
    .getByRole('checkbox', { name: 'Enable manual posting on this connection', exact: true })
    .check();
  await page.getByLabel('Writing token', { exact: true }).fill('fictional-browser-writing-key');
  await page.getByRole('button', { name: 'Save writing setup', exact: true }).click();
  await page.getByRole('button', { name: 'Check writing account', exact: true }).click();
  await page.getByRole('button', { name: 'New message', exact: true }).click();
  await page.getByLabel('Message text', { exact: true }).fill('My manually reviewed message.');
  await page.getByLabel('Post audience', { exact: true }).selectOption('private');
  await page.getByRole('button', { name: 'Save local draft', exact: true }).click();
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Open draft', exact: true }).click();
  await expect(page.getByLabel('Message text', { exact: true })).toHaveValue(
    'My manually reviewed message.',
  );
  await page.getByRole('button', { name: 'Review send', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('fixture.writer');
  await expect(page.getByRole('dialog')).toContainText('https://social.example.com · private');
  await page.getByRole('button', { name: 'Send reviewed message', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Mocked unknown outcome; nothing sent.' }),
  ).toBeVisible();
  const posting = page.getByRole('region', { name: 'Manual posting', exact: true });
  await posting.getByText('Posting receipts · 1', { exact: true }).click();
  await posting.getByLabel('Provider post ID to check', { exact: true }).fill('12345');
  await posting.getByRole('button', { name: 'Check send outcome', exact: true }).click();
  await expect(
    posting.getByText('Mocked read-only lookup confirmed; nothing resent.', { exact: true }),
  ).toBeVisible();
  expect(submissions).toBe(1);
  expect(outcomeChecks).toBe(1);
  const sanitized = await (await page.request.get('/api/state')).json();
  expect(JSON.stringify(sanitized)).not.toContain('fictional-browser-writing-key');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/posting-connection-mobile.png', fullPage: true });
  await page.getByRole('heading', { name: 'Manual posting', exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/posting-live-controls-mobile.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('reading controls and local item edits remain isolated in preview', async ({ page }) => {
  let workspaceCalls = 0;
  page.on('request', (request) => {
    if (request.url().includes('/api/')) workspaceCalls++;
  });
  await page.goto('/preview/customize');
  await page.getByText('Item-type text overrides', { exact: true }).click();
  await page.getByLabel('post text limit', { exact: true }).selectOption('words');
  await page.getByLabel('post maximum', { exact: true }).fill('2');
  await page.getByLabel('Font size', { exact: true }).fill('20');
  await page.getByLabel('Reading width', { exact: true }).selectOption('narrow');
  await page.getByLabel('Conversation preview messages', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'Save customization', exact: true }).first().click();
  await page.getByRole('button', { name: 'Feed view', exact: true }).click();
  const post = page.locator('.timeline-entry.post').filter({ hasText: 'Maya Chen' }).first();
  await expect(post.locator('.post-body')).toHaveText('The most…');
  await expect(page.locator('.reading-layout')).toHaveClass(/reading-width-narrow/);
  await expect(
    page.locator('.conversation-preview-messages').first().locator(':scope > div'),
  ).toHaveCount(1);
  await post.getByRole('button', { name: /Edit local copy:/ }).click();
  await expect(page.getByRole('dialog', { name: 'Edit local copy' })).toBeVisible();
  const originalTitle = await page.getByLabel('Local title', { exact: true }).inputValue();
  await page.getByLabel('Local title', { exact: true }).fill('Unsaved manual QA title');
  page.once('dialog', (dialog) => {
    expect(dialog.type()).toBe('confirm');
    expect(dialog.message()).toBe('Discard these unsaved local edits?');
    void dialog.dismiss();
  });
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByLabel('Local title', { exact: true })).toHaveValue(
    'Unsaved manual QA title',
  );
  page.once('dialog', (dialog) => void dialog.accept());
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Feed view', exact: true }).click();
  await post.getByRole('button', { name: /Edit local copy:/ }).click();
  await expect(page.getByLabel('Local title', { exact: true })).toHaveValue(originalTitle);
  await page.getByLabel('Local title', { exact: true }).fill('My local title');
  await page.getByLabel('Local body', { exact: true }).fill('Edited body for display only.');
  await page.getByRole('button', { name: 'Save local copy', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.locator('.collected-item').filter({ hasText: 'My local title' })).toContainText(
    'Edited local copy',
  );
  await page.getByRole('button', { name: 'Feed view', exact: true }).click();
  const edited = page.locator('.timeline-entry.post').filter({ hasText: 'Edited body' });
  await expect(edited).toContainText('Edited local copy');
  await edited.getByRole('button', { name: /Edit local copy:/ }).click();
  await page.getByRole('button', { name: 'Reset local edits', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm reset local edits', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(workspaceCalls).toBe(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/local-editor-mobile.png' });
});

test('YouTube source setup retains private key and explicit playlist scope after reload and repair', async ({
  page,
}) => {
  await page.route('**/api/connections/*/sync', async (route) => {
    await route.fulfill({ status: 200, json: await (await page.request.get('/api/state')).json() });
  });
  await page.goto('/connections');
  await page.getByRole('button', { name: 'Add connection', exact: true }).first().click();
  await page.getByRole('button', { name: /YouTube videos Public channel/ }).click();
  await page.getByLabel('Connection name', { exact: true }).fill('YouTube review fixture');
  await page.getByLabel('YouTube public source', { exact: true }).selectOption('shorts-playlist');
  await page.getByLabel('Public playlist ID', { exact: true }).fill('PL-fictional-review');
  await page
    .getByLabel('YouTube Data API key', { exact: true })
    .fill('fictional-youtube-browser-key');
  await page.getByRole('button', { name: 'Add connection', exact: true }).last().click();
  await expect(
    page.getByRole('heading', { name: 'YouTube review fixture', exact: true }),
  ).toBeVisible();
  const state = await (await page.request.get('/api/state')).json();
  const connection = state.connections.find(
    (c: { name: string }) => c.name === 'YouTube review fixture',
  );
  expect(connection.youtube).toEqual({ source: 'shorts-playlist' });
  expect(connection.hasSecret).toBe(true);
  expect(JSON.stringify(state)).not.toContain('fictional-youtube-browser-key');
  await page.reload();
  await page.getByRole('button', { name: 'Edit connection', exact: true }).click();
  await expect(page.getByLabel('YouTube public source')).toHaveValue('shorts-playlist');
  await expect(page.getByLabel('Public playlist ID', { exact: true })).toHaveValue(
    'PL-fictional-review',
  );
  await expect(page.getByLabel('YouTube Data API key', { exact: true })).toHaveValue('');
  await page.getByLabel('Connection name', { exact: true }).fill('YouTube reviewed name');
  await page.getByRole('button', { name: 'Save connection', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'YouTube reviewed name', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Edit connection', exact: true }).click();
  await page.getByLabel('YouTube public source').selectOption('playlist');
  await page.getByLabel(/Reset this connection’s collected items/).check();
  await page.getByRole('button', { name: 'Save connection', exact: true }).click();
  const repaired = await (await page.request.get('/api/state')).json();
  const current = repaired.connections.find((c: { id: string }) => c.id === connection.id);
  expect(current.youtube).toEqual({ source: 'playlist' });
  expect(current.hasSecret).toBe(true);
  await page.request.delete(`/api/connections/${connection.id}`, { data: {} });
});

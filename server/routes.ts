export const ROUTES = [
  {
    method: 'GET',
    path: '/api/history',
    purpose:
      'Bounded revision-scoped retained history; evaluate complete lenses/read filters before paging; reject stale cursors.',
  },
  {
    method: 'GET',
    path: '/api/feeds/:id/digest-plan',
    purpose:
      'Review bounded original inputs/context and selected-feed pipeline instructions without provider calls or spending.',
  },
  {
    method: 'GET',
    path: '/api/state',
    purpose: 'Read local workspace; encrypted credentials are removed.',
  },
  { method: 'POST', path: '/api/feeds', purpose: 'Create a feed; enforce the 5-feed limit.' },
  {
    method: 'PATCH',
    path: '/api/feeds/:id',
    purpose:
      'Save feed rules, pipeline digest profile/instructions, reading preferences and mention alerts; reject stale edits.',
  },
  {
    method: 'DELETE',
    path: '/api/feeds/:id',
    purpose:
      'Remove feed, links, digest, and feed receipts; preserve connections/items and at least one feed.',
  },
  {
    method: 'POST',
    path: '/api/connections',
    purpose:
      'Create an independent source, optionally link feeds; enforce 3 connections per feed; encrypt credentials.',
  },
  {
    method: 'PATCH',
    path: '/api/connections/:id',
    purpose:
      'Pause/resume, link feeds, or repair versioned configuration and encrypted credentials; identity changes require explicit data reset.',
  },
  {
    method: 'DELETE',
    path: '/api/connections/:id',
    purpose:
      'Disconnect source and remove reading/writing credentials, items and drafts; retain send metadata without retracting transmitted messages.',
  },
  {
    method: 'POST',
    path: '/api/feeds/:id/sync',
    purpose: 'Sync enabled sources; deduplicate repeated requests and record outcomes.',
  },
  {
    method: 'POST',
    path: '/api/connections/:id/sync',
    purpose:
      'Collect source data independently of feed links; coalesce source syncs and record a source receipt.',
  },
  {
    method: 'POST',
    path: '/api/connections/:id/history',
    purpose:
      'Collect a bounded older page from supported sources; preserve eligible grouping and saved/read identity.',
  },
  {
    method: 'POST',
    path: '/api/connections/:id/check',
    purpose:
      'Bounded read-only check of saved configuration; record sanitized health/count without ingesting items; discard changed configuration results.',
  },
  {
    method: 'PATCH',
    path: '/api/entries/:id',
    purpose:
      'Save/read an item or save/reset a revision-checked local title/body override; collected originals remain unchanged.',
  },
  {
    method: 'PATCH',
    path: '/api/profile',
    purpose: 'Save local reader identity and appearance; reject stale edits.',
  },
  {
    method: 'PUT',
    path: '/api/ai',
    purpose: 'Configure user-provided AI key and model, or disconnect AI.',
  },
  {
    method: 'POST',
    path: '/api/feeds/:id/digest',
    purpose:
      'Review-confirmed digest: exact token count, user-verified rate/cost reservation, bounded output, sanitized uncertain/completed receipts; configured model only.',
  },
  {
    method: 'PUT',
    path: '/api/connections/:id/posting',
    purpose:
      'Version-checked separate encrypted writing credential/opt-in; no provider call or message on save.',
  },
  {
    method: 'POST',
    path: '/api/connections/:id/posting/check',
    purpose:
      'Read-only writing identity/channel/instance check; preserve source collection and make no post.',
  },
  {
    method: 'POST',
    path: '/api/outbound/drafts',
    purpose: 'Create a local connection-owned text draft; at most 50 drafts; no provider effects.',
  },
  {
    method: 'PATCH',
    path: '/api/outbound/drafts/:id',
    purpose:
      'Edit current unsubmitted draft version; sent/unknown/active drafts cannot be resubmitted or overwritten.',
  },
  {
    method: 'DELETE',
    path: '/api/outbound/drafts/:id',
    purpose:
      'Remove local draft only; active/uncertain sends remain available; preserve receipts and remote messages.',
  },
  {
    method: 'GET',
    path: '/api/outbound/drafts/:id/review',
    purpose:
      'Issue five-minute local review bound to exact draft/account/destination/reply/limits; no provider call.',
  },
  {
    method: 'POST',
    path: '/api/outbound/drafts/:id/send',
    purpose:
      'Explicit confirmed reviewed send after fresh read-only preflight; persist attempts, acknowledge or lock uncertain outcomes; duplicate tokens do not resend.',
  },
  {
    method: 'POST',
    path: '/api/outbound/receipts/:id/check',
    purpose:
      'Read-only reconciliation of an unknown send against frozen sender/draft/destination/reply; matching provider evidence confirms delivery, never retransmits or unlocks missing outcomes.',
  },
] as const;

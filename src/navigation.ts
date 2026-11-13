import { useEffect, useState } from 'react';

export type Page =
  | 'connections'
  | 'feeds'
  | 'reader'
  | 'background'
  | 'saved'
  | 'profile'
  | 'settings';
export interface Route {
  page: Page;
  preview: boolean;
  feedId?: string;
  tab?: string;
  invalid?: boolean;
}
export function readRoute(url = new URL(window.location.href)): Route {
  const parts = url.pathname.split('/').filter(Boolean);
  const preview = parts[0] === 'preview';
  const params = url.searchParams;
  if (preview) {
    const page = parts[1];
    return {
      preview,
      invalid:
        parts.length > 2 ||
        ![
          'feed',
          'feeds',
          'customize',
          'background',
          'connections',
          'saved',
          'profile',
          'settings',
        ].includes(page),
      feedId: params.get('feed') || undefined,
      page:
        page === 'feed' || page === 'feeds'
          ? 'reader'
          : page === 'customize' || page === 'background'
            ? 'background'
            : ['connections', 'feeds', 'saved', 'profile', 'settings'].includes(page)
              ? (page as Page)
              : 'feeds',
      tab: page === 'customize' ? 'customize' : params.get('tab') || undefined,
    };
  }
  if (parts[0] === 'connections')
    return {
      preview,
      invalid: parts.length > 1,
      page: 'connections',
      tab: params.get('tab') || undefined,
    };
  if (parts[0] === 'profile' || parts[0] === 'settings')
    return {
      preview,
      invalid: parts.length > 1,
      page: parts[0],
      tab: params.get('tab') || undefined,
    };
  if (parts[0] === 'feeds') {
    if (!parts[1]) return { preview, page: 'reader' };
    return {
      preview,
      invalid: !!parts[2] && !['saved', 'customize', 'background'].includes(parts[2]),
      feedId: parts[1],
      page: parts[2] === 'saved' ? 'saved' : parts[2] ? 'background' : 'reader',
      tab: parts[2] === 'customize' ? 'customize' : params.get('tab') || 'connections',
    };
  }
  return { preview, page: 'reader', invalid: parts.length > 0 };
}
export function pagePath(page: Page, preview: boolean, feedId?: string, tab?: string) {
  if (preview) {
    const path =
      page === 'reader'
        ? 'feed'
        : page === 'background' && tab === 'customize'
          ? 'customize'
          : page;
    const params = new URLSearchParams();
    if (feedId && ['reader', 'background', 'saved'].includes(page)) params.set('feed', feedId);
    if (tab && path !== 'customize') params.set('tab', tab);
    return `/preview/${path}${params.size ? `?${params}` : ''}`;
  }
  if (page === 'feeds' || page === 'profile') return `/${page}`;
  if (page === 'connections') return `/connections${tab ? `?tab=${encodeURIComponent(tab)}` : ''}`;
  if (page === 'settings') return `/settings${tab ? `?tab=${encodeURIComponent(tab)}` : ''}`;
  const base = `/feeds/${feedId}`;
  return page === 'reader'
    ? base
    : page === 'saved'
      ? `${base}/saved`
      : tab === 'customize'
        ? `${base}/customize`
        : `${base}/background${tab ? `?tab=${encodeURIComponent(tab)}` : ''}`;
}
export function useNavigation() {
  const [route, setRoute] = useState(() => readRoute());
  useEffect(() => {
    const update = () => setRoute(readRoute());
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, []);
  function navigate(path: string) {
    if (window.location.pathname + window.location.search !== path)
      window.history.pushState(null, '', path);
    setRoute(readRoute());
  }
  return { route, navigate };
}

import { useEffect, useState, useRef } from 'react';
import type { Decision } from '../shared/model';
import { historyQuerySchema, type HistoryPage } from '../shared/history';
import { query } from './api';
export function useHistory({
  live,
  revision,
  scope,
  fallback,
}: {
  live: boolean;
  revision: number;
  scope: Record<string, string | undefined>;
  fallback: Decision[];
}) {
  const key = JSON.stringify(scope);
  const generation = useRef(0);
  const [result, setResult] = useState<HistoryPage & { scopeKey: string }>(),
    [loading, setLoading] = useState(false),
    [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    generation.current++;
    setLoading(true);
    setError('');
    const params = new URLSearchParams(
      Object.entries(scope).filter((pair): pair is [string, string] => pair[1] !== undefined),
    );
    query<HistoryPage>(`/history?${params}`)
      .then((data) => {
        if (!cancelled) setResult({ ...data, scopeKey: key });
      })
      .catch((error) => {
        if (!cancelled) setError(error.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [live, revision, key, reload]);
  async function more() {
    if (!result?.nextCursor || loading) return;
    setLoading(true);
    setError('');
    const requestGeneration = generation.current;
    try {
      const params = new URLSearchParams(
        Object.entries(scope).filter((pair): pair is [string, string] => pair[1] !== undefined),
      );
      params.set('cursor', result.nextCursor);
      const next = await query<HistoryPage>(`/history?${params}`);
      if (requestGeneration !== generation.current) return;
      setResult((old) =>
        old?.revision === next.revision
          ? { ...next, scopeKey: key, decisions: [...old.decisions, ...next.decisions] }
          : { ...next, scopeKey: key },
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : 'History could not load.');
    } finally {
      setLoading(false);
    }
  }
  const previewLimit = 30 * (reload + 1);
  return {
    decisions: live
      ? result?.scopeKey === key && result.revision >= revision
        ? result.decisions
        : []
      : fallback.slice(0, previewLimit),
    total: live
      ? result?.scopeKey === key && result.revision >= revision
        ? result.total
        : 0
      : fallback.length,
    includedTotal: live
      ? result?.scopeKey === key && result.revision >= revision
        ? result.includedTotal
        : 0
      : fallback.filter((d) => d.included).length,
    loading,
    error,
    more: live ? more : () => setReload((value) => value + 1),
    hasMore: live ? !!result?.nextCursor : previewLimit < fallback.length,
    reload: () => setReload((value) => value + 1),
  };
}

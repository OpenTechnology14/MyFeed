import { useState, type Dispatch, type SetStateAction } from 'react';

// Local session memory only. Never store credentials or provider configuration here.
const drafts = new Map<string, { value: unknown; baseline: string }>();
export function hasUnsavedDrafts() {
  return [...drafts.values()].some((d) => JSON.stringify(d.value) !== d.baseline);
}
export function useSessionDraft<T>(
  key: string,
  initial: T,
): [T, Dispatch<SetStateAction<T>>, (next: T) => void, boolean] {
  const [value, setValue] = useState<T>(() => (drafts.get(key)?.value as T | undefined) ?? initial);
  const [baseline, setBaseline] = useState(
    () => drafts.get(key)?.baseline ?? JSON.stringify(initial),
  );
  const set: Dispatch<SetStateAction<T>> = (next) =>
    setValue((old) => {
      const value = typeof next === 'function' ? (next as (v: T) => T)(old) : next;
      drafts.set(key, { value, baseline });
      return value;
    });
  function reset(next: T) {
    drafts.delete(key);
    setBaseline(JSON.stringify(next));
    setValue(next);
  }
  return [value, set, reset, JSON.stringify(value) !== baseline];
}

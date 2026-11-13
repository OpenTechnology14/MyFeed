import type { Entry } from './model';
// Presentation only. Filtering, alerts, ranking and generation always use Entry originals.
export function displayedEntry(entry: Entry): Entry {
  return entry.localEdit
    ? { ...entry, title: entry.localEdit.title, content: entry.localEdit.content }
    : entry;
}

import type { State } from '../shared/model';
export async function request(
  path: string,
  method = 'GET',
  body?: unknown,
): Promise<State & { createdId?: string }> {
  const response = await fetch(`/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-MyFeed-Summary': '1' },
    ...(method === 'GET' || method === 'DELETE' ? {} : { body: JSON.stringify(body ?? {}) }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed.');
  return data;
}

export async function query<T>(path: string): Promise<T> {
  const response = await fetch(`/api${path}`);
  const data = await response.json();
  if (!response.ok) throw Error(data.error || 'Request failed.');
  return data;
}

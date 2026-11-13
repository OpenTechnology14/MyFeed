export default async function verifyIsolatedApi() {
  const session = process.env.MYFEED_E2E_SESSION;
  if (!session) throw Error('Missing isolated browser-test session.');
  for (let attempt = 0; attempt < 100; attempt++) {
    let response: Response;
    try {
      response = await fetch('http://127.0.0.1:5188/api/state', {
        headers: { 'X-MyFeed-Test-Session': session },
        signal: AbortSignal.timeout(1000),
      });
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
      continue;
    }
    const marker = response.headers.get('X-MyFeed-Test-Session');
    await response.body?.cancel();
    // Vite returns 500 for ECONNREFUSED while the isolated API is still starting.
    // Never accept it as readiness; a marked HTTP 500 must pass the guard below.
    if ([502, 503, 504].includes(response.status) || (response.status === 500 && marker === null)) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      continue;
    }
    if (!response.ok || marker !== session)
      throw Error(
        `Refusing browser tests: Vite is not connected to this run’s isolated API (HTTP ${response.status}; matching session ${marker === session}). Stop the normal MyFeed server first. No browser test was run.`,
      );
    return;
  }
  throw Error('Could not verify the isolated API. No browser test was run.');
}

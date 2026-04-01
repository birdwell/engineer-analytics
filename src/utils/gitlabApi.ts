const API_BASE = 'https://gitlab.com/api/v4';

const inflightRequests = new Map<string, Promise<Response>>();
const responseCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL_MS = 60_000;

let rateLimitRemaining = 100;
let rateLimitReset = 0;

function buildHeaders(token: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function updateRateLimits(response: Response) {
  const remaining = response.headers.get('RateLimit-Remaining');
  const reset = response.headers.get('RateLimit-Reset');
  if (remaining !== null) rateLimitRemaining = parseInt(remaining, 10);
  if (reset !== null) rateLimitReset = parseInt(reset, 10);
}

async function waitForRateLimit() {
  if (rateLimitRemaining > 5) return;
  const waitMs = Math.max(0, (rateLimitReset * 1000) - Date.now()) + 100;
  if (waitMs > 0 && waitMs < 60_000) {
    await new Promise(resolve => setTimeout(resolve, waitMs));
  }
}

async function fetchWithDedup(url: string, token: string, timeoutMs = 15_000): Promise<Response> {
  await waitForRateLimit();

  const existing = inflightRequests.get(url);
  if (existing) return existing.then(r => r.clone());

  const promise = fetch(url, {
    headers: buildHeaders(token),
    signal: AbortSignal.timeout(timeoutMs),
  }).then(response => {
    updateRateLimits(response);
    inflightRequests.delete(url);
    return response;
  }).catch(err => {
    inflightRequests.delete(url);
    throw err;
  });

  inflightRequests.set(url, promise);
  return promise;
}

export async function gitlabGet<T>(
  path: string,
  token: string,
  options: { timeoutMs?: number; cacheTtl?: number } = {}
): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const { timeoutMs = 15_000, cacheTtl = CACHE_TTL_MS } = options;

  const cached = responseCache.get(url);
  if (cached && (Date.now() - cached.timestamp) < cacheTtl) {
    return cached.data as T;
  }

  const response = await fetchWithDedup(url, token, timeoutMs);
  if (!response.ok) {
    throw new Error(`GitLab API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  responseCache.set(url, { data, timestamp: Date.now() });
  return data as T;
}

export async function gitlabGetSafe<T>(
  path: string,
  token: string,
  fallback: T,
  options: { timeoutMs?: number; cacheTtl?: number } = {}
): Promise<T> {
  try {
    return await gitlabGet<T>(path, token, options);
  } catch {
    return fallback;
  }
}

export async function gitlabGetAllPages<T>(
  path: string,
  token: string,
  options: { perPage?: number; maxPages?: number; timeoutMs?: number } = {}
): Promise<T[]> {
  const { perPage = 100, maxPages = 20, timeoutMs = 15_000 } = options;
  const separator = path.includes('?') ? '&' : '?';
  const allItems: T[] = [];

  for (let page = 1; page <= maxPages; page++) {
    await waitForRateLimit();
    const url = `${API_BASE}${path}${separator}per_page=${perPage}&page=${page}`;

    const response = await fetchWithDedup(url, token, timeoutMs);
    if (!response.ok) {
      throw new Error(`GitLab API error: ${response.status} ${response.statusText}`);
    }

    const items: T[] = await response.json();
    allItems.push(...items);

    if (items.length < perPage) break;
  }

  return allItems;
}

export async function runBatch<TInput, TOutput>(
  items: TInput[],
  fn: (item: TInput) => Promise<TOutput>,
  concurrency = 8,
  delayMs = 50
): Promise<TOutput[]> {
  const results: TOutput[] = [];

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const settled = await Promise.allSettled(batch.map(fn));

    settled.forEach(result => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      }
    });

    if (i + concurrency < items.length && delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

export function clearApiCache() {
  responseCache.clear();
  inflightRequests.clear();
}

export { API_BASE };

/**
 * You.com Search API
 * @reference https://github.com/youdotcom-oss/agent-skills/blob/main/skills/youdotcom-api/SKILL.md
 */
import { ISearchRequestOptions, ISearchResponse } from '../interface.js';
import { searchLogger } from './logger.js';

const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_COUNT = 10;
const SEARCH_ENDPOINT = 'https://ydc-index.io/v1/search';

export interface YouDotComSearchResponse {
  results?: {
    web?: Array<{
      url: string;
      title?: string;
      description?: string;
      snippets?: string[];
      contents?: { markdown?: string };
    }>;
    news?: Array<{
      url: string;
      title?: string;
      description?: string;
      snippets?: string[];
      contents?: { markdown?: string };
    }>;
  };
}

function resolveTimeoutMs(timeout?: number | string): number {
  const parsed = Number(timeout);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_TIMEOUT_MS;
  return parsed;
}

function mapSnippet(description?: string, snippets?: string[]): string {
  return description || snippets?.[0] || '';
}

export async function ydcSearch(options: ISearchRequestOptions, signal?: AbortSignal): Promise<ISearchResponse> {
  const { query, limit = DEFAULT_COUNT, apiKey } = options;

  if (!query?.trim()) {
    throw new Error('Query cannot be empty');
  }

  if (!apiKey) {
    throw new Error('YDC API key is required');
  }

  if (signal?.aborted) {
    throw signal.reason instanceof Error ? signal.reason : new Error('You.com search aborted');
  }

  const url = new URL(SEARCH_ENDPOINT);
  url.searchParams.set('query', query);
  url.searchParams.set('count', String(limit));
  if (options.language) url.searchParams.set('language', options.language);
  if (options.timeRange) url.searchParams.set('freshness', options.timeRange);
  if (options.safeSearch !== undefined) {
    url.searchParams.set('safesearch', ['off', 'moderate', 'strict'][options.safeSearch] ?? 'moderate');
  }
  if (options.engines && options.engines !== 'all') url.searchParams.set('livecrawl', 'web');

  const controller = new AbortController();
  const timeoutMs = resolveTimeoutMs(options.timeout);
  const timeoutId = setTimeout(() => controller.abort(new Error('You.com search timed out')), timeoutMs);
  const onAbort = () => controller.abort(signal?.reason ?? new Error('You.com search aborted'));
  if (signal) signal.addEventListener('abort', onAbort, { once: true });

  try {
    const resp = await fetch(url, {
      headers: { 'X-API-Key': apiKey },
      signal: controller.signal,
    });

    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`You.com Search API error ${resp.status}: ${body}`);
    }

    const data = await resp.json() as YouDotComSearchResponse;
    const results = [...(data.results?.web ?? []), ...(data.results?.news ?? [])].slice(0, limit).map((item) => ({
      title: item.title ?? item.url,
      url: item.url,
      snippet: mapSnippet(item.description, item.snippets),
      markdown: item.contents?.markdown,
      engine: 'ydc',
    }));

    return { results, success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'You.com search error.';
    searchLogger.error(msg);
    throw error;
  } finally {
    clearTimeout(timeoutId);
    if (signal) signal.removeEventListener('abort', onAbort);
  }
}

/**
 * You.com Search API
 * @reference https://docs.you.com/
 */

import type { ISearchRequestOptions, ISearchResponse, ISearchResponseResult } from '../interface.js';
import { searchLogger } from './logger.js';
import { createRequestSignal } from './request-signal.js';

const YOUCOM_SEARCH_ENDPOINT = 'https://ydc-index.io/v1/search';
const DEFAULT_TIMEOUT = 20000;

interface YoucomSearchItem {
  title?: string;
  url?: string;
  description?: string;
  snippet?: string;
  snippets?: string[];
  contents?: { markdown?: string };
}

interface YoucomSearchResponse {
  results?: {
    web?: YoucomSearchItem[];
    news?: YoucomSearchItem[];
  };
}

export async function youcomSearch(options: ISearchRequestOptions, signal?: AbortSignal): Promise<ISearchResponse> {
  const { query, apiKey, limit = 10, timeRange, language } = options;

  if (!query?.trim()) {
    throw new Error('Query cannot be empty');
  }

  if (!apiKey) {
    throw new Error('You.com search requires YDC_API_KEY');
  }

  const requestSignal = createRequestSignal({
    signal,
    timeoutMs: DEFAULT_TIMEOUT,
    timeoutMessage: 'You.com search timeout',
  });

  try {
    const url = new URL(YOUCOM_SEARCH_ENDPOINT);
    url.searchParams.set('query', query);
    url.searchParams.set('count', String(limit));
    if (timeRange) url.searchParams.set('freshness', timeRange);
    if (language) url.searchParams.set('language', language);

    const response = await fetch(url, {
      headers: {
        'X-API-Key': apiKey,
      },
      signal: requestSignal.signal,
    });

    if (!response.ok) {
      throw new Error(`You.com search failed: ${response.status} ${response.statusText}`);
    }

    const data: YoucomSearchResponse = await response.json();
    const items = [...(data.results?.web ?? []), ...(data.results?.news ?? [])];

    const results: ISearchResponseResult[] = items.map((item) => ({
      title: item.title ?? '',
      url: item.url ?? '',
      snippet: item.description ?? item.snippet ?? item.snippets?.[0] ?? item.contents?.markdown ?? '',
      engine: 'youcom',
    }));

    return { results, success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'You.com search error.';
    searchLogger.error(msg);
    throw err;
  } finally {
    requestSignal.cleanup();
  }
}

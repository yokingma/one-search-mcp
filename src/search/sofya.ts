/**
 * Sofya Search API
 * @reference https://sofya.co
 */

import { ISearchRequestOptions, ISearchResponse, ISearchResponseResult } from '../interface.js';
import { searchLogger } from './logger.js';
import { createRequestSignal } from './request-signal.js';

const SOFYA_SEARCH_ENDPOINT = 'https://sofya.co/v1/search';
const DEFAULT_TIMEOUT = 20000;
const MAX_RESULTS = 20;

const VALID_SOFYA_TOPICS = new Set(['general', 'news']);
const TIME_RANGE_TO_FRESHNESS: Record<string, string> = {
  day: 'day',
  week: 'week',
  month: 'month',
  year: 'year',
  d: 'day',
  w: 'week',
  m: 'month',
  y: 'year',
};

function normalizeTopic(categories?: string): string | undefined {
  if (!categories || !VALID_SOFYA_TOPICS.has(categories)) {
    return undefined;
  }

  return categories;
}

function normalizeFreshness(timeRange?: string): string | undefined {
  if (!timeRange) {
    return undefined;
  }

  return TIME_RANGE_TO_FRESHNESS[timeRange];
}

interface SofyaSearchResponse {
  results: Array<{
    title?: string;
    url: string;
    content?: string;
  }>;
}

export async function sofyaSearch(options: ISearchRequestOptions, signal?: AbortSignal): Promise<ISearchResponse> {
  const { query, apiKey, limit = 10, categories, timeRange } = options;

  if (!query?.trim()) {
    throw new Error('Query cannot be empty');
  }

  if (!apiKey) {
    throw new Error('Sofya search requires SEARCH_API_KEY');
  }

  const requestSignal = createRequestSignal({
    signal,
    timeoutMs: DEFAULT_TIMEOUT,
    timeoutMessage: 'Sofya search timeout',
  });

  const body: Record<string, unknown> = {
    query,
    max_results: Math.min(limit, MAX_RESULTS),
  };

  const topic = normalizeTopic(categories);
  if (topic) {
    body.topic = topic;
  }

  const freshness = normalizeFreshness(timeRange);
  if (freshness) {
    body.freshness = freshness;
  }

  try {
    const response = await fetch(SOFYA_SEARCH_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: requestSignal.signal,
    });

    if (!response.ok) {
      throw new Error(`Sofya search failed: ${response.status} ${response.statusText}`);
    }

    const result: SofyaSearchResponse = await response.json();

    const results: ISearchResponseResult[] = result.results.map((item) => ({
      title: item.title || '',
      url: item.url,
      snippet: item.content || '',
      engine: 'sofya',
    }));

    return { results, success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Sofya search error.';
    searchLogger.error(msg);
    throw err;
  } finally {
    requestSignal.cleanup();
  }
}

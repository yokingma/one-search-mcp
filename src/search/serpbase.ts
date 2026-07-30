/**
 * SerpBase Google Search Results API
 * @reference https://serpbase.dev/docs
 */
import { ISearchRequestOptions, ISearchResponse } from '../interface.js';
import { searchLogger } from './logger.js';
import { createRequestSignal } from './request-signal.js';

const SERPBASE_ENDPOINT = 'https://api.serpbase.dev/google/search';
const DEFAULT_TIMEOUT = 20000;

interface SerpBaseOrganicResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}

interface SerpBaseResponse {
  organic_results?: SerpBaseOrganicResult[];
  error?: string;
}

export async function serpbaseSearch(
  options: ISearchRequestOptions,
  signal?: AbortSignal,
): Promise<ISearchResponse> {
  const { query, limit = 10, apiKey } = options;

  if (!query?.trim()) {
    throw new Error('Query cannot be empty');
  }

  if (!apiKey) {
    searchLogger.warn('SERPBASE_API_KEY not set — skipping SerpBase search. Get a free API key at https://serpbase.dev');
    return { results: [], success: true };
  }

  const params = new URLSearchParams({
    q: query,
    api_key: apiKey,
    num: String(Math.min(limit, 100)),
  });

  const requestSignal = createRequestSignal({
    signal,
    timeoutMs: DEFAULT_TIMEOUT,
    timeoutMessage: 'SerpBase search timeout',
  });

  try {
    const response = await fetch(`${SERPBASE_ENDPOINT}?${params}`, {
      method: 'GET',
      signal: requestSignal.signal,
    });

    if (!response.ok) {
      throw new Error(`SerpBase search failed: ${response.status} ${response.statusText}`);
    }

    const data: SerpBaseResponse = await response.json();

    if (data.error) {
      throw new Error(`SerpBase API error: ${data.error}`);
    }

    const items = data.organic_results ?? [];
    const results = items.map((item) => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet || '',
      source: new URL(item.link).hostname,
      engine: 'serpbase',
    }));

    return { results, success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'SerpBase search error.';
    searchLogger.error(msg);
    throw err;
  } finally {
    requestSignal.cleanup();
  }
}

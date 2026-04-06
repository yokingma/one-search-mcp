/**
 * Tavily Search API
 * @reference https://docs.tavily.com/documentation/quickstart
 */
import { ISearchRequestOptions, ISearchResponse } from '../interface.js';
import { searchLogger } from './logger.js';
import { createRequestSignal } from './request-signal.js';

const TAVILY_SEARCH_ENDPOINT = 'https://api.tavily.com/search';
const DEFAULT_TIMEOUT = 20000;

interface TavilySearchResponse {
  results: Array<{
    title: string;
    url: string;
    content: string;
  }>;
}

export async function tavilySearch(options: ISearchRequestOptions, signal?: AbortSignal): Promise<ISearchResponse> {
  const {
    query,
    limit = 10,
    categories = 'general',
    timeRange,
    apiKey,
  } = options;

  if (!query?.trim()) {
    throw new Error('Query cannot be empty');
  }

  if (!apiKey) {
    throw new Error('Tavily API key is required');
  }

  const requestSignal = createRequestSignal({
    signal,
    timeoutMs: DEFAULT_TIMEOUT,
    timeoutMessage: 'Tavily search timeout',
  });

  try {
    const response = await fetch(TAVILY_SEARCH_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        topic: categories,
        time_range: timeRange,
        max_results: limit,
      }),
      signal: requestSignal.signal,
    });

    if (!response.ok) {
      throw new Error(`Tavily search failed: ${response.status} ${response.statusText}`);
    }

    const res: TavilySearchResponse = await response.json();

    const results = res.results.map(item => ({
      title: item.title,
      url: item.url,
      snippet: item.content,
      engine: 'tavily',
    }));

    return {
      results,
      success: true,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Tavily search error.';
    searchLogger.error(msg);
    throw error;
  } finally {
    requestSignal.cleanup();
  }
}

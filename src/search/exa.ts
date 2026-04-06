/**
 * Exa Search API
 * @reference https://docs.exa.ai/reference/search
 */

import { ISearchRequestOptions, ISearchResponse, ISearchResponseResult } from '../interface.js';
import { searchLogger } from './logger.js';
import { createRequestSignal } from './request-signal.js';

const EXA_SEARCH_ENDPOINT = 'https://api.exa.ai/search';
const DEFAULT_TIMEOUT = 20000;
const DEFAULT_TEXT_CHARACTERS = 10000;

interface ExaSearchResponse {
  results: Array<{
    title: string | null;
    url: string;
    text?: string;
  }>;
}

export async function exaSearch(options: ISearchRequestOptions, signal?: AbortSignal): Promise<ISearchResponse> {
  const { query, apiKey, limit = 10 } = options;

  if (!query?.trim()) {
    throw new Error('Query cannot be empty');
  }

  if (!apiKey) {
    throw new Error('Exa search requires SEARCH_API_KEY');
  }

  const requestSignal = createRequestSignal({
    signal,
    timeoutMs: DEFAULT_TIMEOUT,
    timeoutMessage: 'Exa search timeout',
  });

  try {
    const response = await fetch(EXA_SEARCH_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        query,
        numResults: limit,
        contents: {
          text: {
            maxCharacters: DEFAULT_TEXT_CHARACTERS,
          },
        },
      }),
      signal: requestSignal.signal,
    });

    if (!response.ok) {
      throw new Error(`Exa search failed: ${response.status} ${response.statusText}`);
    }

    const result: ExaSearchResponse = await response.json();

    const results: ISearchResponseResult[] = result.results.map((item) => ({
      title: item.title || '',
      url: item.url,
      snippet: (item as { text?: string }).text || '',
      engine: 'exa',
    }));

    return { results, success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Exa search error.';
    searchLogger.error(msg);
    throw err;
  } finally {
    requestSignal.cleanup();
  }
}

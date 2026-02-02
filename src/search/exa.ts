/**
 * Exa Search API
 * @reference https://docs.exa.ai/reference/search
 */

import { Exa } from 'exa-js';
import { ISearchRequestOptions, ISearchResponse, ISearchResponseResult } from '../interface.js';
import { searchLogger } from './logger.js';

const DEFAULT_TIMEOUT = 20000;

export async function exaSearch(options: ISearchRequestOptions): Promise<ISearchResponse> {
  const { query, apiKey, limit = 10 } = options;

  if (!query?.trim()) {
    throw new Error('Query cannot be empty');
  }

  if (!apiKey) {
    throw new Error('Exa search requires SEARCH_API_KEY');
  }

  let timeoutId: NodeJS.Timeout | undefined;

  try {
    const exa = new Exa(apiKey);

    const result = await Promise.race([
      exa.search(query, {
        numResults: limit,
        contents: {
          text: true,
        },
      }),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Exa search timeout')), DEFAULT_TIMEOUT);
      }),
    ]);

    clearTimeout(timeoutId);

    const results: ISearchResponseResult[] = result.results.map((item) => ({
      title: item.title || '',
      url: item.url,
      snippet: (item as { text?: string }).text || '',
      engine: 'exa',
    }));

    return { results, success: true };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const msg = err instanceof Error ? err.message : 'Exa search error.';
    searchLogger.error(msg);
    throw err;
  }
}

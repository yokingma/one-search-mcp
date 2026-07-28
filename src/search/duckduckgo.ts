import * as DDG from 'ddg-kit';
import asyncRetry from 'async-retry';
import type { SearchOptions } from 'ddg-kit';
import { ISearchRequestOptions, ISearchResponse } from '../interface.js';
import { searchLogger } from './logger.js';

export async function duckDuckGoSearch(
  options: ISearchRequestOptions & SearchOptions,
  signal?: AbortSignal,
): Promise<ISearchResponse> {
  const { query, timeout = 10000, safeSearch = DDG.SafeSearchType.OFF, retry = { retries: 3 }, ...searchOptions } = options;

  if (!query?.trim()) {
    throw new Error('Query cannot be empty');
  }

  try {
    const res = await asyncRetry(
      async (bail) => {
        try {
          return await DDG.search(
            query,
            {
              ...searchOptions,
              safeSearch,
            },
            {
              timeoutMs: Number(timeout),
              signal,
            },
          );
        } catch (error) {
          if (signal?.aborted) {
            return bail(signal.reason ?? error);
          }

          if (error instanceof DDG.DdgError && (error.code === 'BOT_CHALLENGE' || !error.retryable)) {
            return bail(error);
          }

          throw error;
        }
      },
      retry,
    );

    const results = res ? {
      noResults: res.noResults,
      vqd: res.vqd,
      results: res.results,
    } : {
      noResults: true,
      vqd: '',
      results: [],
    };

    return {
      results: results.results.map((result) => ({
        title: result.title,
        snippet: result.description,
        url: result.url,
        source: result.hostname,
        image: null,
        video: null,
        engine: 'duckduckgo',
      })),
      success: true,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'DuckDuckGo search error.';
    searchLogger.error(msg);
    throw error;
  }
}

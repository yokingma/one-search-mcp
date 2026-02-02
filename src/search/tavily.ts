/**
 * Tavily Search API
 * @reference https://docs.tavily.com/documentation/quickstart
 */
import { tavily, TavilySearchOptions } from '@tavily/core';
import { ISearchRequestOptions, ISearchResponse } from '../interface.js';
import { searchLogger } from './logger.js';

const DEFAULT_TIMEOUT = 20000;

export async function tavilySearch(options: ISearchRequestOptions): Promise<ISearchResponse> {
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

  let timeoutId: NodeJS.Timeout | undefined;

  try {
    const tvly = tavily({
      apiKey,
    });

    const params: TavilySearchOptions = {
      topic: categories as TavilySearchOptions['topic'],
      timeRange: timeRange as TavilySearchOptions['timeRange'],
      maxResults: limit,
    };

    const res = await Promise.race([
      tvly.search(query, params),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Tavily search timeout')), DEFAULT_TIMEOUT);
      }),
    ]);

    clearTimeout(timeoutId);

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
    clearTimeout(timeoutId);
    const msg = error instanceof Error ? error.message : 'Tavily search error.';
    searchLogger.error(msg);
    throw error;
  }
}

/**
 * Tavily Search API
 * @reference https://docs.tavily.com/documentation/quickstart
 */
import { tavily, type TavilySearchOptions } from '@tavily/core';
import { ISearchRequestOptions, ISearchResponse } from '../interface.js';
import { searchLogger } from './logger.js';

const DEFAULT_TIMEOUT_MS = 20000;
const VALID_TAVILY_TOPICS = new Set(['general', 'news', 'finance']);
const VALID_TAVILY_TIME_RANGES = new Set(['day', 'week', 'month', 'year', 'd', 'w', 'm', 'y']);

function normalizeTavilyTopic(categories?: string): TavilySearchOptions['topic'] | undefined {
  if (!categories || !VALID_TAVILY_TOPICS.has(categories)) {
    return undefined;
  }

  return categories as TavilySearchOptions['topic'];
}

function normalizeTavilyTimeRange(timeRange?: string): TavilySearchOptions['timeRange'] | undefined {
  if (!timeRange || !VALID_TAVILY_TIME_RANGES.has(timeRange)) {
    return undefined;
  }

  return timeRange as TavilySearchOptions['timeRange'];
}

function resolveTimeoutSeconds(timeout?: number | string): number {
  const parsedTimeout = Number(timeout);

  if (!Number.isFinite(parsedTimeout) || parsedTimeout <= 0) {
    return Math.ceil(DEFAULT_TIMEOUT_MS / 1000);
  }

  return Math.ceil(parsedTimeout / 1000);
}

export async function tavilySearch(options: ISearchRequestOptions, signal?: AbortSignal): Promise<ISearchResponse> {
  const {
    query,
    limit = 10,
    categories,
    timeRange,
    apiKey,
  } = options;

  if (!query?.trim()) {
    throw new Error('Query cannot be empty');
  }

  if (!apiKey) {
    throw new Error('Tavily API key is required');
  }

  if (signal?.aborted) {
    throw signal.reason instanceof Error ? signal.reason : new Error('Tavily search aborted');
  }

  const client = tavily({ apiKey });
  const searchOptions: TavilySearchOptions = {
    maxResults: limit,
    timeout: resolveTimeoutSeconds(options.timeout),
  };

  const topic = normalizeTavilyTopic(categories);
  if (topic) {
    searchOptions.topic = topic;
  }

  const normalizedTimeRange = normalizeTavilyTimeRange(timeRange);
  if (normalizedTimeRange) {
    searchOptions.timeRange = normalizedTimeRange;
  }

  try {
    const res = await client.search(query, searchOptions);

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
  }
}

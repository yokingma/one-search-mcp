import { describe, expect, it, vi } from 'vitest';
import type { ISearchResponse } from '../src/interface.ts';
import { processSearch, type SearchHandlers } from '../src/search/process-search.ts';

const SEARCH_SUCCESS: ISearchResponse = {
  results: [],
  success: true,
};

function createSearchHandlers(): SearchHandlers {
  return {
    searxngSearch: vi.fn(async () => SEARCH_SUCCESS),
    tavilySearch: vi.fn(async () => SEARCH_SUCCESS),
    bingSearch: vi.fn(async () => SEARCH_SUCCESS),
    duckDuckGoSearch: vi.fn(async () => SEARCH_SUCCESS),
    localSearch: vi.fn(async () => SEARCH_SUCCESS),
    googleSearch: vi.fn(async () => SEARCH_SUCCESS),
    zhipuSearch: vi.fn(async () => SEARCH_SUCCESS),
    exaSearch: vi.fn(async () => SEARCH_SUCCESS),
    bochaSearch: vi.fn(async () => SEARCH_SUCCESS),
  };
}

const SEARCH_DEFAULT_OPTIONS = {
  limit: 10,
  categories: 'general',
  format: 'json',
  safeSearch: 0 as const,
  language: 'auto',
  engines: 'all',
  timeRange: '',
  timeout: 10000,
};

describe('processSearch', () => {
  it.each([
    { provider: 'searxng', handlerKey: 'searxngSearch' },
    { provider: 'tavily', handlerKey: 'tavilySearch' },
    { provider: 'bing', handlerKey: 'bingSearch' },
    { provider: 'duckduckgo', handlerKey: 'duckDuckGoSearch' },
    { provider: 'local', handlerKey: 'localSearch' },
    { provider: 'google', handlerKey: 'googleSearch' },
    { provider: 'zhipu', handlerKey: 'zhipuSearch' },
    { provider: 'exa', handlerKey: 'exaSearch' },
    { provider: 'bocha', handlerKey: 'bochaSearch' },
  ] as const)('passes the abort signal into the $provider provider', async ({ provider, handlerKey }) => {
    const handlers = createSearchHandlers();
    const controller = new AbortController();

    await processSearch(
      { query: 'mcp' },
      {
        provider,
        apiKey: 'test-api-key',
        apiUrl: 'https://example.com',
        defaultSearchOptions: SEARCH_DEFAULT_OPTIONS,
      },
      controller.signal,
      handlers,
    );

    const handler = handlers[handlerKey];
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0]?.[1]).toBe(controller.signal);
  });
});

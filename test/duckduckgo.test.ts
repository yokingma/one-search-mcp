import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('ddg-kit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ddg-kit')>();

  return {
    ...actual,
    search: vi.fn(),
  };
});

import { DdgError, SafeSearchType, search } from 'ddg-kit';
import { duckDuckGoSearch } from '../src/search/duckduckgo.js';

const mockedSearch = vi.mocked(search);

describe('duckDuckGoSearch', () => {
  beforeEach(() => {
    mockedSearch.mockReset();
  });

  it('maps the request timeout and search result through ddg-kit', async () => {
    const signal = new AbortController().signal;
    mockedSearch.mockResolvedValue({
      noResults: false,
      vqd: 'test-vqd',
      results: [
        {
          title: 'Example result',
          description: 'Example description',
          rawDescription: 'Example description',
          url: 'https://example.com/result',
          hostname: 'example.com',
          icon: '',
        },
      ],
    });

    const response = await duckDuckGoSearch(
      {
        query: 'example query',
        timeout: '2500',
        retry: { retries: 0 },
        safeSearch: SafeSearchType.MODERATE,
      },
      signal,
    );

    expect(mockedSearch).toHaveBeenCalledWith(
      'example query',
      { safeSearch: SafeSearchType.MODERATE },
      { timeoutMs: 2500, signal },
    );
    expect(response).toEqual({
      success: true,
      results: [
        {
          title: 'Example result',
          snippet: 'Example description',
          url: 'https://example.com/result',
          source: 'example.com',
          image: null,
          video: null,
          engine: 'duckduckgo',
        },
      ],
    });
  });

  it('does not retry a DuckDuckGo bot challenge immediately', async () => {
    vi.useFakeTimers();
    const error = new DdgError('BOT_CHALLENGE', 'Provider returned a bot challenge.', {
      retryable: true,
      cooldownMs: 60_000,
    });
    mockedSearch.mockRejectedValue(error);

    try {
      await expect(duckDuckGoSearch({
        query: 'example query',
        retry: { retries: 3, minTimeout: 0 },
      })).rejects.toBe(error);
      await vi.runAllTimersAsync();
      expect(mockedSearch).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not retry a non-retryable ddg-kit error', async () => {
    vi.useFakeTimers();
    const error = new DdgError('UNSUPPORTED_OPTION', 'The option cannot be preserved.', {
      retryable: false,
    });
    mockedSearch.mockRejectedValue(error);

    try {
      await expect(duckDuckGoSearch({
        query: 'example query',
        retry: { retries: 3, minTimeout: 0 },
      })).rejects.toBe(error);
      await vi.runAllTimersAsync();
      expect(mockedSearch).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

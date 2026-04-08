import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSearch, mockTavily } = vi.hoisted(() => ({
  mockSearch: vi.fn(),
  mockTavily: vi.fn(),
}));

vi.mock('@tavily/core', () => ({
  tavily: mockTavily,
}));

import { tavilySearch } from '../src/search/tavily.ts';

describe('tavilySearch', () => {
  beforeEach(() => {
    mockSearch.mockReset();
    mockTavily.mockReset();
    mockTavily.mockReturnValue({
      search: mockSearch,
    });
  });

  it('uses the Tavily SDK with normalized search options', async () => {
    mockSearch.mockResolvedValue({
      query: '伊朗的新闻',
      responseTime: 0.42,
      images: [],
      results: [
        {
          title: 'Iran news',
          url: 'https://example.com/iran-news',
          content: 'Latest Iran news summary',
          score: 0.98,
          publishedDate: '2026-04-08',
        },
      ],
      requestId: 'req_123',
    });

    const result = await tavilySearch({
      query: '伊朗的新闻',
      apiKey: 'tvly-test-key',
      limit: 5,
      categories: 'news',
      timeRange: 'week',
    });

    expect(mockTavily).toHaveBeenCalledWith({ apiKey: 'tvly-test-key' });
    expect(mockSearch).toHaveBeenCalledWith('伊朗的新闻', {
      maxResults: 5,
      timeRange: 'week',
      timeout: 20,
      topic: 'news',
    });
    expect(result).toEqual({
      results: [
        {
          title: 'Iran news',
          url: 'https://example.com/iran-news',
          snippet: 'Latest Iran news summary',
          engine: 'tavily',
        },
      ],
      success: true,
    });
  });

  it('omits unsupported topic and empty time range values', async () => {
    mockSearch.mockResolvedValue({
      query: 'mcp',
      responseTime: 0.2,
      images: [],
      results: [],
      requestId: 'req_456',
    });

    await tavilySearch({
      query: 'mcp',
      apiKey: 'tvly-test-key',
      categories: 'science',
      timeRange: '',
    });

    expect(mockSearch).toHaveBeenCalledWith('mcp', {
      maxResults: 10,
      timeout: 20,
    });
  });

  it('fails before calling the SDK when the request is already aborted', async () => {
    const controller = new AbortController();
    controller.abort(new Error('Tavily search aborted'));

    await expect(
      tavilySearch(
        {
          query: 'mcp',
          apiKey: 'tvly-test-key',
        },
        controller.signal,
      ),
    ).rejects.toThrow('Tavily search aborted');

    expect(mockTavily).not.toHaveBeenCalled();
    expect(mockSearch).not.toHaveBeenCalled();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockFetch = vi.fn();

vi.stubGlobal('fetch', mockFetch);

afterEach(() => {
  mockFetch.mockReset();
});

import { ydcSearch } from '../src/search/ydc.ts';

describe('ydcSearch', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('calls the You.com Search API and maps results', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        results: {
          web: [
            {
              url: 'https://example.com/agent',
              title: 'Agent Search',
              description: 'Search for agent tools',
              snippets: ['Snippet text'],
              contents: { markdown: '# Agent Search' },
            },
          ],
          news: [
            {
              url: 'https://example.com/news',
              title: 'Agent News',
              snippets: ['News snippet'],
            },
          ],
        },
      }),
      text: async () => '',
    });

    const result = await ydcSearch({
      query: 'agent search',
      apiKey: 'ydc-test-key',
      limit: 2,
      language: 'en',
      timeRange: 'week',
      safeSearch: 1,
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = mockFetch.mock.calls[0] ?? [];
    expect(String(requestUrl)).toContain('https://ydc-index.io/v1/search');
    expect(String(requestUrl)).toContain('query=agent+search');
    expect(String(requestUrl)).toContain('count=2');
    expect(requestInit).toMatchObject({
      headers: { 'X-API-Key': 'ydc-test-key' },
    });
    expect(result).toEqual({
      results: [
        {
          title: 'Agent Search',
          url: 'https://example.com/agent',
          snippet: 'Search for agent tools',
          markdown: '# Agent Search',
          engine: 'ydc',
        },
        {
          title: 'Agent News',
          url: 'https://example.com/news',
          snippet: 'News snippet',
          markdown: undefined,
          engine: 'ydc',
        },
      ],
      success: true,
    });
  });

  it('fails fast when the API key is missing', async () => {
    await expect(ydcSearch({ query: 'mcp' })).rejects.toThrow('YDC API key is required');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('normalizes shared defaults - omits language when auto', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ results: { web: [], news: [] } }),
      text: async () => '',
    });

    await ydcSearch({
      query: 'test',
      apiKey: 'test-key',
      language: 'auto',
    });

    const [requestUrl] = mockFetch.mock.calls[0] ?? [];
    expect(String(requestUrl)).not.toContain('language=auto');
  });

  it('normalizes shared defaults - omits freshness when timeRange is all', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ results: { web: [], news: [] } }),
      text: async () => '',
    });

    await ydcSearch({
      query: 'test',
      apiKey: 'test-key',
      timeRange: 'all',
    });

    const [requestUrl] = mockFetch.mock.calls[0] ?? [];
    expect(String(requestUrl)).not.toContain('freshness=all');
  });

  it('normalizes shared defaults - omits freshness when timeRange is empty', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ results: { web: [], news: [] } }),
      text: async () => '',
    });

    await ydcSearch({
      query: 'test',
      apiKey: 'test-key',
      timeRange: '   ',
    });

    const [requestUrl] = mockFetch.mock.calls[0] ?? [];
    expect(String(requestUrl)).not.toContain('freshness=');
  });

  it('respects total limit when combining web and news results', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        results: {
          web: [
            { url: 'https://web1.com', title: 'Web 1' },
            { url: 'https://web2.com', title: 'Web 2' },
            { url: 'https://web3.com', title: 'Web 3' },
          ],
          news: [
            { url: 'https://news1.com', title: 'News 1' },
            { url: 'https://news2.com', title: 'News 2' },
          ],
        },
      }),
      text: async () => '',
    });

    const result = await ydcSearch({
      query: 'test',
      apiKey: 'test-key',
      limit: 3,
    });

    expect(result.results).toHaveLength(3);
    expect(result.results.map(r => r.url)).toEqual([
      'https://web1.com',
      'https://web2.com', 
      'https://web3.com',
    ]);
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { searxngSearch } from '../src/search/searxng.ts';

describe('searxngSearch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('uses GET query params for the SearXNG search API', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        results: [
          {
            title: 'One Search MCP',
            content: 'Search provider for MCP',
            url: 'https://example.com/one-search-mcp',
            engine: 'google',
          },
        ],
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await searxngSearch({
      query: 'mcp',
      apiUrl: 'https://example.com',
      apiKey: 'test-api-key',
      timeRange: 'month',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] ?? [];
    expect(requestUrl).toBe('https://example.com/search?q=mcp&pageno=1&categories=general&format=json&safesearch=0&language=auto&engines=all&time_range=month');
    expect(requestInit).toMatchObject({
      method: 'GET',
      headers: {
        Authorization: 'Bearer test-api-key',
      },
    });
    expect(requestInit?.body).toBeUndefined();
    expect(result).toEqual({
      results: [
        {
          title: 'One Search MCP',
          snippet: 'Search provider for MCP',
          url: 'https://example.com/one-search-mcp',
          source: undefined,
          image: null,
          video: null,
          engine: 'google',
        },
      ],
      success: true,
    });
  });

  it('omits unsupported timeRange values for SearXNG', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ results: [] }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    await searxngSearch({
      query: 'mcp',
      apiUrl: 'https://example.com',
      timeRange: 'all',
    });

    const [requestUrl] = fetchMock.mock.calls[0] ?? [];
    expect(requestUrl).toBe('https://example.com/search?q=mcp&pageno=1&categories=general&format=json&safesearch=0&language=auto&engines=all');
  });

  it('throws a clear error when SearXNG returns a non-2xx response', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(searxngSearch({
      query: 'mcp',
      apiUrl: 'https://example.com',
    })).rejects.toThrow('SearxNG search failed: 403 Forbidden');
  });

  it('throws a clear error when SearXNG returns invalid JSON', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => {
        throw new SyntaxError('Unexpected token < in JSON');
      },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(searxngSearch({
      query: 'mcp',
      apiUrl: 'https://example.com',
    })).rejects.toThrow('SearxNG search returned invalid JSON response');
  });
});

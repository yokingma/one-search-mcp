import { afterEach, describe, expect, it, vi } from 'vitest';
import { youcomSearch } from '../src/search/youcom.ts';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('youcomSearch', () => {
  it('maps You.com results into the common search shape', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      results: {
        web: [
          { title: 'One', url: 'https://example.com/one', description: 'First result' },
        ],
        news: [
          { title: 'Two', url: 'https://example.com/two', snippets: ['Second result'] },
        ],
      },
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await youcomSearch({ query: 'mcp tools', apiKey: 'test-api-key', limit: 2, timeRange: 'week' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const request = fetchMock.mock.calls[0]?.[0] as URL;
    expect(String(request)).toContain('https://ydc-index.io/v1/search?');
    expect(String(request)).toContain('query=mcp+tools');
    expect(String(request)).toContain('count=2');
    expect(String(request)).toContain('freshness=week');
    expect(result).toMatchObject({
      success: true,
      results: [
        { title: 'One', url: 'https://example.com/one', snippet: 'First result', engine: 'youcom' },
        { title: 'Two', url: 'https://example.com/two', snippet: 'Second result', engine: 'youcom' },
      ],
    });
  });

  it('throws a clear setup error when YDC_API_KEY is missing', async () => {
    delete process.env.YDC_API_KEY;
    await expect(youcomSearch({ query: 'mcp tools' })).rejects.toThrow('You.com search requires YDC_API_KEY');
  });
});

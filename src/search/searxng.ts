import { ISearchRequestOptions, ISearchResponse, ISearchResponseResult } from '../interface.js';
import { searchLogger } from './logger.js';
import { createRequestSignal } from './request-signal.js';

const VALID_SEARXNG_TIME_RANGES = new Set(['day', 'month', 'year']);

/**
 * SearxNG Search API
 * @reference https://docs.searxng.org/dev/search_api.html
 */
export async function searxngSearch(params: ISearchRequestOptions, signal?: AbortSignal): Promise<ISearchResponse> {
  const {
    query,
    page = 1,
    limit = 10,
    categories = 'general',
    engines = 'all',
    safeSearch = 0,
    format = 'json',
    language = 'auto',
    timeRange = '',
    timeout = 10000,
    apiKey,
    apiUrl,
  } = params;

  if (!query?.trim()) {
    throw new Error('Query cannot be empty');
  }

  if (!apiUrl) {
    throw new Error('SearxNG API URL is required');
  }

  const requestSignal = createRequestSignal({
    signal,
    timeoutMs: Number(timeout),
    timeoutMessage: 'Searxng search timeout',
  });

  try {
    const queryParams = new URLSearchParams({
      q: query,
      pageno: String(page),
      categories,
      format,
      safesearch: String(safeSearch),
      language,
      engines,
    });

    if (VALID_SEARXNG_TIME_RANGES.has(timeRange)) {
      queryParams.set('time_range', timeRange);
    }

    const headers: HeadersInit = {};

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const res = await fetch(`${apiUrl}/search?${queryParams.toString()}`, {
      method: 'GET',
      headers,
      signal: requestSignal.signal,
    });

    if (!res.ok) {
      throw new Error(`SearxNG search failed: ${res.status} ${res.statusText}`);
    }

    let response: { results?: Array<Record<string, any>> };

    try {
      response = await res.json();
    } catch {
      throw new Error('SearxNG search returned invalid JSON response');
    }

    if (response.results) {
      const list = response.results.slice(0, limit);
      const results: ISearchResponseResult[] = list.map((item: Record<string, any>) => {
        const image = item.img_src ? {
          thumbnail: item.thumbnail_src,
          src: item.img_src,
        } : null;
        const video = item.iframe_src ? {
          thumbnail: item.thumbnail_src,
          src: item.iframe_src,
        } : null;
        return {
          title: item.title,
          snippet: item.content,
          url: item.url,
          source: item.source,
          image,
          video,
          engine: item.engine,
        };
      });
      return {
        results,
        success: true,
      };
    }
    return {
      results: [],
      success: false,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Searxng search error.';
    searchLogger.error(msg);
    throw err;
  } finally {
    requestSignal.cleanup();
  }
}

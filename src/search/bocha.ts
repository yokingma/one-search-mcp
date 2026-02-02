/**
 * Bocha Search API
 * @reference https://api.bocha.cn/docs
 */

import { ISearchRequestOptions, ISearchResponse, ISearchResponseResult } from '../interface.js';
import { searchLogger } from './logger.js';

const BOCHA_SEARCH_ENDPOINT = 'https://api.bocha.cn/v1/web-search';
const DEFAULT_TIMEOUT = 20000;

export type BochaFreshness = 'noLimit' | 'oneDay' | 'oneWeek' | 'oneMonth' | 'oneYear';

interface BochaSearchItem {
  name?: string;
  title?: string;
  url?: string;
  link?: string;
  snippet?: string;
  summary?: string;
  content?: string;
  datePublished?: string;
  publish_date?: string;
  siteName?: string;
  site_name?: string;
  urlToImage?: string;
  icon?: string;
}

interface BochaSearchResponse {
  data?: {
    webPages?: {
      value?: BochaSearchItem[];
    };
  };
  webPages?: {
    value?: BochaSearchItem[];
  };
  results?: BochaSearchItem[];
}

export async function bochaSearch(options: ISearchRequestOptions): Promise<ISearchResponse> {
  const { query, apiKey, limit = 10, timeRange } = options;

  if (!query?.trim()) {
    throw new Error('Query cannot be empty');
  }

  if (!apiKey) {
    throw new Error('Bocha search requires SEARCH_API_KEY');
  }

  let freshness: BochaFreshness = 'noLimit';
  if (timeRange) {
    const freshnessMap: Record<string, BochaFreshness> = {
      day: 'oneDay',
      week: 'oneWeek',
      month: 'oneMonth',
      year: 'oneYear',
    };
    freshness = freshnessMap[timeRange] || 'noLimit';
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  try {
    const response = await fetch(BOCHA_SEARCH_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        count: limit,
        summary: true,
        freshness,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Bocha search failed: ${response.status} ${response.statusText}`);
    }

    const data: BochaSearchResponse = await response.json();
    const items: BochaSearchItem[] =
      data?.data?.webPages?.value || data?.webPages?.value || data?.results || [];

    const results: ISearchResponseResult[] = items.map((item) => ({
      title: item.name || item.title || '',
      url: item.url || item.link || '',
      snippet: item.snippet || item.summary || item.content || '',
      source: item.siteName || item.site_name,
      thumbnailUrl: item.urlToImage || item.icon,
      engine: 'bocha',
    }));

    return { results, success: true };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const msg = err instanceof Error ? err.message : 'Bocha search error.';
    searchLogger.error(msg);
    throw err;
  }
}

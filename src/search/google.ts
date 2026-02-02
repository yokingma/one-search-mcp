/**
 * Google Custom Search API
 * @reference https://developers.google.com/custom-search/v1/overview
 */

import { ISearchRequestOptions, ISearchResponse, ISearchResponseResult } from '../interface.js';
import { searchLogger } from './logger.js';

const GOOGLE_SEARCH_ENDPOINT = 'https://www.googleapis.com/customsearch/v1';
const DEFAULT_TIMEOUT = 20000;

interface GoogleSearchItem {
  title: string;
  link: string;
  snippet: string;
  displayLink?: string;
  formattedUrl?: string;
  pagemap?: {
    cse_thumbnail?: Array<{ src: string }>;
  };
}

interface GoogleSearchResponse {
  items?: GoogleSearchItem[];
  error?: {
    message: string;
  };
}

export async function googleSearch(options: ISearchRequestOptions): Promise<ISearchResponse> {
  const { query, apiKey, apiUrl, limit = 10, language } = options;

  if (!query?.trim()) {
    throw new Error('Query cannot be empty');
  }

  if (!apiKey || !apiUrl) {
    throw new Error('Google search requires SEARCH_API_KEY and SEARCH_API_URL (Search Engine ID)');
  }

  const params = new URLSearchParams({
    key: apiKey,
    cx: apiUrl,
    q: query,
    num: String(Math.min(limit, 10)),
  });

  if (language && language !== 'auto') {
    params.set('lr', `lang_${language}`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  try {
    const response = await fetch(`${GOOGLE_SEARCH_ENDPOINT}?${params}`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Google search failed: ${response.status} ${response.statusText}`);
    }

    const data: GoogleSearchResponse = await response.json();

    if (data.error) {
      throw new Error(`Google API error: ${data.error.message}`);
    }

    const items = data.items ?? [];
    const results: ISearchResponseResult[] = items.map((item) => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet || '',
      source: item.displayLink,
      thumbnailUrl: item.pagemap?.cse_thumbnail?.[0]?.src,
      engine: 'google',
    }));

    return { results, success: true };
  } catch (error) {
    clearTimeout(timeoutId);
    const msg = error instanceof Error ? error.message : 'Google search error.';
    searchLogger.error(msg);
    throw error;
  }
}

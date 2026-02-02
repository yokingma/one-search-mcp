/**
 * Bing Search API
 * @reference https://learn.microsoft.com/en-us/previous-versions/bing/search-apis/bing-web-search/create-bing-search-service-resource
 */
import { ISearchRequestOptions, ISearchResponse } from '../interface.js';
import { searchLogger } from './logger.js';

const DEFAULT_TIMEOUT = 20000;


/**
 * Options for performing a Bing search
 */
export interface BingSearchOptions {
  /**
   * Search query string
   */
  q: string;

  /**
   * Number of results to return
   */
  count?: number;

  /**
   * Result offset for pagination
   */
  offset?: number;

  /**
   * Market code (e.g., 'en-US')
   */
  mkt?: string;

  /**
   * Safe search filtering level
   */
  safeSearch?: 'Off' | 'Moderate' | 'Strict';

  /**
   * Bing API key
   */
  apiKey: string;

  /**
   * Bing Search API URL
   */
  apiUrl?: string;

  /**
   * Additional parameters supported by Bing Search API
   */
  [key: string]: any;
}

/**
 * Represents a web page result from Bing Search
 */
export interface BingSearchWebPage {
  /**
   * Title of the web page
   */
  name: string;

  /**
   * URL of the web page
   */
  url: string;

  /**
   * Text snippet from the web page
   */
  snippet: string;

  /**
   * Date the page was last crawled by Bing
   */
  dateLastCrawled?: string;

  /**
   * Display URL for the web page
   */
  displayUrl?: string;

  /**
   * Unique identifier for the result
   */
  id?: string;

  /**
   * Indicates if the content is family friendly
   */
  isFamilyFriendly?: boolean;

  /**
   * Indicates if the result is navigational
   */
  isNavigational?: boolean;

  /**
   * Language of the web page
   */
  language?: string;

  /**
   * Indicates if caching should be disabled
   */
  noCache?: boolean;

  /**
   * Name of the website
   */
  siteName?: string;

  /**
   * URL to a thumbnail image
   */
  thumbnailUrl?: string;
}

/**
 * Represents an image result from Bing Search
 */
export interface BingSearchImage {
  contentSize: string;
  contentUrl: string;
  datePublished: string;
  encodingFormat: string;
  height: number;
  width: number;
  hostPageDisplayUrl: string;
  hostPageUrl: string;
  name: string;
  thumbnail: {
    height: number;
    width: number;
  };
  thumbnailUrl: string;
  webSearchUrl: string;
}

/**
 * Represents a video result from Bing Search
 */
export interface BingSearchVideo {
  allowHttpsEmbed: boolean;
  allowMobileEmbed: boolean;
  contentUrl: string;
  creator?: {
    name: string;
  };
  datePublished: string;
  description: string;
  duration: string;
  embedHtml: string;
  encodingFormat: string;
  height: number;
  width: number;
  hostPageDisplayUrl: string;
  hostPageUrl: string;
  name: string;
  publisher?: {
    name: string;
  }[];
  thumbnail: {
    height: number;
    width: number;
  };
  thumbnailUrl: string;
  viewCount?: number;
  webSearchUrl: string;
}

export interface BingSearchResponse {
  _type?: string;
  queryContext?: {
    originalQuery: string;
  };
  webPages?: {
    value: BingSearchWebPage[];
    totalEstimatedMatches?: number;
    someResultsRemoved?: boolean;
    webSearchUrl?: string;
  };
  images?: {
    value: BingSearchImage[];
    isFamilyFriendly?: boolean;
    readLink?: string;
    webSearchUrl?: string;
    id?: string;
  };
  videos?: {
    value: BingSearchVideo[];
    isFamilyFriendly?: boolean;
    readLink?: string;
    webSearchUrl?: string;
    id?: string;
    scenario?: string;
  };
  rankingResponse?: {
    mainline?: {
      items: {
        answerType: string;
        resultIndex?: number;
        value: {
          id: string;
        };
      }[];
    };
  };
  [key: string]: any; // Allow other response fields
}

export async function bingSearch(options: ISearchRequestOptions): Promise<ISearchResponse> {
  const { query, limit = 10, safeSearch = 0, page = 1, apiUrl = 'https://api.bing.microsoft.com/v7.0/search', apiKey, language } = options;

  if (!query?.trim()) {
    throw new Error('Query cannot be empty');
  }

  if (!apiKey) {
    throw new Error('Bing API key is required');
  }

  const bingSafeSearchOptions = ['Off', 'Moderate', 'Strict'];

  const searchOptions = {
    q: query,
    count: limit,
    offset: (page - 1) * limit,
    mkt: language,
    safeSearch: bingSafeSearchOptions[safeSearch] as 'Off' | 'Moderate' | 'Strict',
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  try {
    const queryParams = new URLSearchParams();
    Object.entries(searchOptions).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.set(key, value.toString());
      }
    });

    const res = await fetch(`${apiUrl}?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': apiKey,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Bing search error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const serp = data.webPages?.value as Array<BingSearchWebPage>;
    const results = serp?.map((item: BingSearchWebPage) => ({
      title: item.name,
      snippet: item.snippet,
      url: item.url,
      source: item.siteName,
      thumbnailUrl: item.thumbnailUrl,
      language: item.language,
      image: null,
      video: null,
      engine: 'bing',
    })) ?? [];

    return {
      results,
      success: true,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const msg = err instanceof Error ? err.message : 'Bing search error.';
    searchLogger.error(msg);
    throw err;
  }
}
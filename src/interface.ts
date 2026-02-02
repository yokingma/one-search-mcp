import type AsyncRetry from 'async-retry';

export interface IMediaItem {
  thumbnail?: string;
  src?: string;
}

export interface ISearchRequestOptions {
  query: string;
  page?: number;
  limit?: number;
  categories?: string;
  format?: string;
  language?: string;
  // search engines: bing,google,baidu
  engines?: string;
  // 0: off, 1: moderate, 2: strict
  safeSearch?: 0 | 1 | 2;
  timeRange?: string;
  timeout?: number | string;
  apiKey?: string;
  apiUrl?: string;
  retry?: AsyncRetry.Options;
}

export interface ISearchResponseResult {
  title: string;
  snippet: string;
  url: string;
  thumbnailUrl?: string;
  markdown?: string;
  source?: string;
  engine?: string;
  image?: IMediaItem | null;
  video?: IMediaItem | null;
}

export interface ISearchResponse {
  results: ISearchResponseResult[];
  success: boolean;
}

export type SearchProvider =
  | 'searxng'
  | 'duckduckgo'
  | 'bing'
  | 'tavily'
  | 'local'
  | 'google'
  | 'zhipu'
  | 'exa'
  | 'bocha';
export type SearchTimeRange = 'year' | 'month' | 'week' | 'day';

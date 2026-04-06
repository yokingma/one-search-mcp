import { SafeSearchType } from 'duck-duck-scrape';
import type { SearchOptions } from 'duck-duck-scrape';
import type { ISearchRequestOptions, ISearchResponse, SearchProvider } from '../interface.js';
import {
  bingSearch,
  bochaSearch,
  duckDuckGoSearch,
  exaSearch,
  googleSearch,
  localSearch,
  searxngSearch,
  tavilySearch,
  zhipuSearch,
} from './index.js';

type SearchHandler = (options: ISearchRequestOptions, signal?: AbortSignal) => Promise<ISearchResponse>;
type DuckDuckGoSearchHandler = (
  options: ISearchRequestOptions & SearchOptions,
  signal?: AbortSignal,
) => Promise<ISearchResponse>;

export interface SearchHandlers {
  searxngSearch: SearchHandler;
  tavilySearch: SearchHandler;
  bingSearch: SearchHandler;
  duckDuckGoSearch: DuckDuckGoSearchHandler;
  localSearch: SearchHandler;
  googleSearch: SearchHandler;
  zhipuSearch: SearchHandler;
  exaSearch: SearchHandler;
  bochaSearch: SearchHandler;
}

export interface SearchProcessConfig {
  provider: SearchProvider;
  apiKey?: string;
  apiUrl?: string;
  defaultSearchOptions: Omit<ISearchRequestOptions, 'query'>;
}

export const defaultSearchHandlers: SearchHandlers = {
  searxngSearch: async (options, signal) => await searxngSearch(options, signal),
  tavilySearch: async (options, signal) => await tavilySearch(options, signal),
  bingSearch: async (options, signal) => await bingSearch(options, signal),
  duckDuckGoSearch: async (options, signal) => await duckDuckGoSearch(options, signal),
  localSearch: async (options, signal) => await localSearch(options, signal),
  googleSearch: async (options, signal) => await googleSearch(options, signal),
  zhipuSearch: async (options, signal) => await zhipuSearch(options, signal),
  exaSearch: async (options, signal) => await exaSearch(options, signal),
  bochaSearch: async (options, signal) => await bochaSearch(options, signal),
};

export async function processSearch(
  args: ISearchRequestOptions,
  config: SearchProcessConfig,
  signal?: AbortSignal,
  handlers: SearchHandlers = defaultSearchHandlers,
): Promise<ISearchResponse> {
  switch (config.provider) {
    case 'searxng': {
      const params = {
        ...config.defaultSearchOptions,
        ...args,
        apiKey: config.apiKey,
      };

      const { categories, language } = config.defaultSearchOptions;

      if (categories) {
        params.categories = categories;
      }

      if (language) {
        params.language = language;
      }

      return await handlers.searxngSearch(params, signal);
    }
    case 'tavily':
      return await handlers.tavilySearch({
        ...config.defaultSearchOptions,
        ...args,
        apiKey: config.apiKey,
      }, signal);
    case 'bing':
      return await handlers.bingSearch({
        ...config.defaultSearchOptions,
        ...args,
        apiKey: config.apiKey,
      }, signal);
    case 'duckduckgo': {
      const safeSearch = args.safeSearch ?? 0;
      const safeSearchOptions = [SafeSearchType.STRICT, SafeSearchType.MODERATE, SafeSearchType.OFF];

      return await handlers.duckDuckGoSearch({
        ...config.defaultSearchOptions,
        ...args,
        apiKey: config.apiKey,
        safeSearch: safeSearchOptions[safeSearch],
      } as ISearchRequestOptions & SearchOptions, signal);
    }
    case 'local':
      return await handlers.localSearch({
        ...config.defaultSearchOptions,
        ...args,
      }, signal);
    case 'google':
      return await handlers.googleSearch({
        ...config.defaultSearchOptions,
        ...args,
        apiKey: config.apiKey,
        apiUrl: config.apiUrl,
      }, signal);
    case 'zhipu':
      return await handlers.zhipuSearch({
        ...config.defaultSearchOptions,
        ...args,
        apiKey: config.apiKey,
      }, signal);
    case 'exa':
      return await handlers.exaSearch({
        ...config.defaultSearchOptions,
        ...args,
        apiKey: config.apiKey,
      }, signal);
    case 'bocha':
      return await handlers.bochaSearch({
        ...config.defaultSearchOptions,
        ...args,
        apiKey: config.apiKey,
      }, signal);
    default:
      throw new Error(`Unsupported search provider: ${config.provider}`);
  }
}

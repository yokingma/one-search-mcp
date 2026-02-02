/**
 * 智谱搜索接口
 * @reference https://bigmodel.cn/dev/api/search-tool/web-search
 */

import { ISearchRequestOptions, ISearchResponse, ISearchResponseResult } from '../interface.js';
import { searchLogger } from './logger.js';

const ZHIPU_SEARCH_ENDPOINT = 'https://open.bigmodel.cn/api/paas/v4/web_search';
const DEFAULT_TIMEOUT = 20000;

export type ZhipuSearchEngine =
  | 'search_std'
  | 'search_pro'
  | 'search_pro_sogou'
  | 'search_pro_quark'
  | 'search_pro_jina'
  | 'search_pro_bing';

interface ZhipuWebSearchItem {
  icon: string;
  title: string;
  link: string;
  content: string;
  media: string;
  refer: string;
  publish_date: string;
}

interface ZhipuSearchResponse {
  search_result?: ZhipuWebSearchItem[];
  search_intent?: Record<string, unknown>;
}

export async function zhipuSearch(options: ISearchRequestOptions): Promise<ISearchResponse> {
  const { query, apiKey, limit = 10, engines } = options;

  if (!query?.trim()) {
    throw new Error('Query cannot be empty');
  }

  if (!apiKey) {
    throw new Error('Zhipu search requires SEARCH_API_KEY');
  }

  const validEngines: ZhipuSearchEngine[] = [
    'search_std',
    'search_pro',
    'search_pro_sogou',
    'search_pro_quark',
    'search_pro_jina',
    'search_pro_bing',
  ];
  const searchEngine: ZhipuSearchEngine = validEngines.includes(engines as ZhipuSearchEngine)
    ? (engines as ZhipuSearchEngine)
    : 'search_std';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  try {
    const response = await fetch(ZHIPU_SEARCH_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        search_engine: searchEngine,
        search_query: query,
        search_intent: false,
        count: limit,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Zhipu search failed: ${response.status} ${response.statusText}`);
    }

    const data: ZhipuSearchResponse = await response.json();
    const items = data.search_result ?? [];

    const results: ISearchResponseResult[] = items.map((item) => ({
      title: item.title,
      url: item.link,
      snippet: item.content,
      source: item.media,
      engine: 'zhipu',
    }));

    return { results, success: true };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const msg = err instanceof Error ? err.message : 'Zhipu search error.';
    searchLogger.error(msg);
    throw err;
  }
}

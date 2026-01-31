import { ISearchRequestOptions, ISearchResponse, ISearchResponseResult } from '../interface.js';
import { AgentBrowser, type SearchEngine, VALID_SEARCH_ENGINES } from '../libs/agent-browser/index.js';
import { PinoLogger } from '../libs/logger/index.js';

const logger = new PinoLogger('[LocalSearch]');

/**
 * Validate if a string is a valid search engine
 */
function isValidEngine(engine: string): engine is SearchEngine {
  return VALID_SEARCH_ENGINES.includes(engine as SearchEngine);
}

/**
 * Convert SearchResult to ISearchResponseResult
 */
function toSearchResponseResult(result: { title: string; url: string; snippet: string; content?: string }, engine: string): ISearchResponseResult {
  return {
    title: result.title,
    snippet: result.snippet,
    url: result.url,
    markdown: result.content,
    engine,
  };
}

export async function localSearch(options: ISearchRequestOptions): Promise<ISearchResponse> {
  const { query, limit = 10 } = options;
  let { engines = 'all' } = options;

  if (engines === 'all') {
    engines = 'bing,google,baidu,sogou';
  }

  const engineList = engines.split(',').map(e => e.trim()).filter(Boolean);

  if (engineList.length === 0) {
    throw new Error('engines is required');
  }

  // Validate engines
  const validEngines = engineList.filter(isValidEngine);
  const invalidEngines = engineList.filter(e => !isValidEngine(e));

  if (invalidEngines.length > 0) {
    logger.warn(`Invalid search engines ignored: ${invalidEngines.join(', ')}`);
  }

  if (validEngines.length === 0) {
    throw new Error(`No valid search engines provided. Valid engines: ${VALID_SEARCH_ENGINES.join(', ')}`);
  }

  const browser = new AgentBrowser({
    headless: true,
    timeout: 30000,
  });

  try {
    const results: ISearchResponseResult[] = [];

    for (const engine of validEngines) {
      try {
        logger.info(`Searching with engine: ${engine}`);
        const searchResults = await browser.search({
          query,
          engine,
          limit,
        });

        if (searchResults.length > 0) {
          // Convert SearchResult to ISearchResponseResult
          const converted = searchResults.map(r => toSearchResponseResult(r, engine));
          results.push(...converted);
          logger.info(`Found ${searchResults.length} results from ${engine}`);
          break; // Use first successful engine
        }
      } catch (err) {
        logger.error(`Failed to search with ${engine}:`, err);
        // Continue to next engine
      }
    }

    logger.info(`Total results found: ${results.length}`);

    return {
      results,
      success: true,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Local search error.';
    logger.error(msg, err);
    throw err;
  } finally {
    await browser.close();
  }
}

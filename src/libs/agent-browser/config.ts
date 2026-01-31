/**
 * Configuration constants for agent-browser
 */
export const BROWSER_CONFIG = {
  /** Default wait time after page load (ms) */
  DEFAULT_WAIT_MS: 2000,

  /** Wait time for search results to load (ms) */
  SEARCH_WAIT_MS: 3000,

  /** Default browser timeout (ms) */
  DEFAULT_TIMEOUT: 30000,

  /** Run browser in headless mode by default */
  DEFAULT_HEADLESS: true,
} as const;

/**
 * Valid search engines
 */
export const VALID_SEARCH_ENGINES = ['bing', 'google', 'baidu', 'sogou'] as const;

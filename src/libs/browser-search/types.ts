/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { BrowserInterface, LaunchOptions, Page } from '../browser/types.js';
import { Logger } from '../logger/index.js';

export type SearchResult = {
  title: string;
  url: string;
  snippet: string;
  content: string;
};

export type LocalBrowserSearchEngine = 'bing' | 'baidu' | 'sogou' | 'google';

export interface BrowserSearchOptions {
  /**
   * Search query
   */
  query: string | string[];
  /**
   * Max results length
   */
  count?: number;
  /**
   * Concurrency search
   */
  concurrency?: number;
  /**
   * Excluded domains
   */
  excludeDomains?: string[];
  /**
   * Max length to extract, rest content will be truncated
   */
  truncate?: number;
  /**
   * Control whether to keep the browser open after search finished
   */
  keepBrowserOpen?: boolean;
  /**
   * Search engine to use (default: 'google')
   */
  engine?: LocalBrowserSearchEngine;
  /**
   * need visited urls
   * @default false
   */
  needVisitedUrls?: boolean;
}

export interface BrowserSearchConfig {
  /**
   * Logger
   */
  logger?: Logger;
  /**
   * Custom browser
   */
  browser?: BrowserInterface;
  /**
   * Custom browser options
   */
  browserOptions?: LaunchOptions;
  /**
   * Set default search engine
   *
   * @default {'github'}
   */
  defaultEngine?: LocalBrowserSearchEngine;
}

export interface SearchEngineAdapter {
  /**
   * Get search URL for the specific engine
   */
  getSearchUrl(
    query: string,
    options: {
      count?: number;
      excludeDomains?: string[];
    },
  ): string;

  /**
   * Extract search results from the page
   */
  extractSearchResults(window: Window): SearchResult[];

  /**
   * Wait for search results to load
   */
  waitForSearchResults?(page: Page, timeout?: number): Promise<void>;
}
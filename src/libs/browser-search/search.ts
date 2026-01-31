/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { LocalBrowser, type BrowserInterface } from '../browser/index.js';
import { READABILITY_SCRIPT } from './readability.js';
import { Logger, defaultLogger } from '../logger/index.js';
import {
  extractPageInformation,
  toMarkdown,
} from './utils.js';
import { PromiseQueue } from './queue.js';
import { shouldSkipDomain, interceptRequest } from './utils.js';
import { getSearchEngine } from './engines/index.js';
import type {
  SearchResult,
  BrowserSearchOptions,
  BrowserSearchConfig,
  LocalBrowserSearchEngine,
} from './types.js';

/**
 * Service class for performing web searches and content extraction
 */
export class BrowserSearch {
  private logger: Logger;
  private browser: BrowserInterface;
  private isBrowserOpen = false;
  private defaultEngine: LocalBrowserSearchEngine;

  constructor(private config: BrowserSearchConfig = {}) {
    this.logger = config?.logger ?? defaultLogger;
    this.browser = config.browser ?? new LocalBrowser({ logger: this.logger });
    this.defaultEngine = config.defaultEngine ?? 'bing';
  }

  /**
   * Search web and extract content from result pages
   */
  async perform(options: BrowserSearchOptions) {
    this.logger.info('Starting search with options:', options);

    const queries = Array.isArray(options.query)
      ? options.query
      : [options.query];
    const excludeDomains = options.excludeDomains || [];
    const count =
      options.count && Math.max(3, Math.floor(options.count / queries.length));
    const engine = options.engine || this.defaultEngine;

    try {
      if (!this.isBrowserOpen) {
        this.logger.info('Launching browser');
        await this.browser.launch(this.config.browserOptions);
        this.isBrowserOpen = true;
      } else {
        this.logger.info('Using existing browser instance');
      }

      const queue = new PromiseQueue(options.concurrency || 15);
      const visitedUrls = new Set<string>();
      const results = await Promise.all(
        queries.map((query) =>
          this.search(this.browser, {
            query,
            count,
            queue,
            visitedUrls,
            excludeDomains,
            truncate: options.truncate,
            needVisitedUrls: options.needVisitedUrls,
            engine,
          }),
        ),
      );

      this.logger.success('Search completed successfully');
      return results.flat();
    } catch (error) {
      this.logger.error('Search failed:', error);
      return [];
    } finally {
      if (!options.keepBrowserOpen && this.isBrowserOpen) {
        await this.closeBrowser();
      }
    }
  }

  /**
   * Explicitly close the browser instance
   */
  async closeBrowser(): Promise<void> {
    if (this.isBrowserOpen) {
      this.logger.info('Closing browser');
      await this.browser.close();
      this.isBrowserOpen = false;
    }
  }

  private async search(
    browser: BrowserInterface,
    options: {
      query: string;
      count?: number;
      needVisitedUrls?: boolean;
      excludeDomains: string[];
      queue: PromiseQueue;
      visitedUrls: Set<string>;
      truncate?: number;
      engine: LocalBrowserSearchEngine;
    },
  ) {
    const searchEngine = getSearchEngine(options.engine);
    const url = searchEngine.getSearchUrl(options.query, {
      count: options.count,
      excludeDomains: options.excludeDomains,
    });

    this.logger.info(`Searching with ${options.engine} engine: ${url}`);

    let links = await browser.evaluateOnNewPage({
      url,
      waitForOptions: {
        waitUntil: 'networkidle2',
      },
      pageFunction: searchEngine.extractSearchResults,
      pageFunctionParams: [],
      beforePageLoad: async (page) => {
        await interceptRequest(page);
      },
      afterPageLoad: async (page) => {
        if (searchEngine.waitForSearchResults)
          await searchEngine.waitForSearchResults(page, 10000);
      },
    });

    this.logger.info(`Fetched ${links?.length ?? 0} links`);

    // Filter links
    links =
      links?.filter((link) => {
        if (options.visitedUrls.has(link.url)) return false;
        options.visitedUrls.add(link.url);
        return !shouldSkipDomain(link.url);
      }) || [];

    if (!links.length) {
      this.logger.info('No valid links found');
      return [];
    }

    // Visit each link and extract content
    const results = await Promise.allSettled(
      options.needVisitedUrls
        ? links.map((item) =>
          options.queue.add(() => this.visitLink(this.browser, item)),
        )
        : links,
    );

    return results
      .map((result) => {
        if (result.status === 'rejected' || !result.value) return null;

        return {
          ...result.value,
          content: options.truncate
            ? result.value.content.slice(0, options.truncate)
            : result.value.content,
        };
      }).filter((v): v is SearchResult => v !== null);
  }

  private async visitLink(
    browser: BrowserInterface,
    item: SearchResult,
  ): Promise<SearchResult | undefined> {
    try {
      this.logger.info('Visiting link:', item.url);

      const result = await browser.evaluateOnNewPage({
        url: item.url,
        pageFunction: extractPageInformation,
        pageFunctionParams: [READABILITY_SCRIPT],
        beforePageLoad: async (page) => {
          await interceptRequest(page);
        },
      });

      if (result) {
        const content = toMarkdown(result.content);
        return { ...result, url: item.url, content, snippet: item.snippet };
      }
    } catch (e) {
      this.logger.error('Failed to visit link:', e);
    }
  }
}

declare global {
  interface Window {
    Readability: any;
  }
}

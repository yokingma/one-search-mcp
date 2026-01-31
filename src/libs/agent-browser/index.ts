import { BrowserManager } from 'agent-browser/dist/browser.js';
import type { Page } from 'playwright-core';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import * as cheerio from 'cheerio';
import { BrowserFinder } from '../browser/finder.js';
import { defaultLogger } from '../logger/index.js';
import { BROWSER_CONFIG } from './config.js';
import type {
  AgentBrowserOptions,
  ScrapeResult,
  ScrapeOptions,
  MapResult,
  MapOptions,
  SearchResult,
  SearchEngine,
  SearchOptions,
} from './types.js';

export class AgentBrowser {
  private browser: BrowserManager;
  private turndown: TurndownService;
  private browserPath?: string;

  constructor(private options: AgentBrowserOptions = {}) {
    this.browser = new BrowserManager();

    // Try to find local browser installation
    try {
      const finder = new BrowserFinder();
      const { executable } = finder.findBrowser();
      this.browserPath = executable;
    } catch (error) {
      // If no local browser found, agent-browser will try to use Playwright's Chromium
      this.browserPath = undefined;
    }

    // Initialize Turndown for HTML to Markdown conversion
    this.turndown = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
    });
    this.turndown.use(gfm);
  }

  /**
   * Ensure browser is launched
   */
  private async ensureLaunched(): Promise<void> {
    if (!this.browser.isLaunched()) {
      try {
        await this.browser.launch({
          id: `session-${Date.now()}`,
          action: 'launch',
          headless: this.options.headless ?? true,
          executablePath: this.browserPath,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Check if this is a browser not installed error
        if (errorMessage.includes('Executable') || errorMessage.includes('browser')) {
          throw new Error(
            'Browser not found. Please install one of the following:\n' +
            '  - Google Chrome: https://www.google.com/chrome/\n' +
            '  - Microsoft Edge: https://www.microsoft.com/edge\n' +
            '  - Chromium: https://www.chromium.org/getting-involved/download-chromium/\n' +
            'Or install via Playwright:\n' +
            '  npx playwright install chromium\n' +
            `Original error: ${errorMessage}`,
          );
        }

        throw error;
      }
    }
  }

  /**
   * Get current page
   */
  private async getPage(): Promise<Page> {
    await this.ensureLaunched();
    return this.browser.getPage();
  }

  /**
   * Navigate to URL
   */
  async navigate(url: string): Promise<void> {
    const page = await this.getPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: this.options.timeout });
  }

  /**
   * Get page HTML
   */
  async getHtml(): Promise<string> {
    const page = await this.getPage();
    return await page.content();
  }

  /**
   * Get page text
   */
  async getText(): Promise<string> {
    const page = await this.getPage();
    return await page.evaluate(() => document.body.innerText);
  }

  /**
   * Take screenshot
   */
  async screenshot(): Promise<string> {
    const page = await this.getPage();
    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: false,
    });
    return `data:image/png;base64,${screenshot.toString('base64')}`;
  }

  /**
   * Wait for time
   */
  async wait(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Close browser
   */
  async close(): Promise<void> {
    if (this.browser.isLaunched()) {
      await this.browser.close();
    }
  }

  /**
   * Scrape a URL and extract content
   */
  async scrapeUrl(url: string, options: ScrapeOptions = {}): Promise<ScrapeResult> {
    try {
      await this.navigate(url);

      // Wait for page load
      if (options.waitFor) {
        await this.wait(options.waitFor);
      } else {
        await this.wait(BROWSER_CONFIG.DEFAULT_WAIT_MS);
      }

      const result: ScrapeResult = { success: true };
      const formats = options.formats || ['markdown'];

      // Get HTML
      const html = await this.getHtml();

      if (formats.includes('markdown')) {
        result.markdown = this.turndown.turndown(html);
      }

      if (formats.includes('html') || formats.includes('rawHtml')) {
        result.html = html;
        result.rawHtml = html;
      }

      if (formats.includes('links')) {
        result.links = this.extractLinks(html, url);
      }

      if (formats.includes('screenshot') || formats.includes('screenshot@fullPage')) {
        result.screenshot = await this.screenshot();
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Map URLs from a starting URL
   */
  async mapUrl(url: string, options: MapOptions = {}): Promise<MapResult> {
    try {
      await this.navigate(url);
      await this.wait(BROWSER_CONFIG.DEFAULT_WAIT_MS);

      const html = await this.getHtml();
      let links = this.extractLinks(html, url);

      // Filter links
      if (options.search) {
        links = links.filter((link) =>
          link.toLowerCase().includes(options.search!.toLowerCase()),
        );
      }

      if (!options.includeSubdomains) {
        const baseHost = new URL(url).hostname;
        links = links.filter((link) => {
          try {
            return new URL(link).hostname === baseHost;
          } catch {
            return false;
          }
        });
      }

      if (options.limit) {
        links = links.slice(0, options.limit);
      }

      return {
        success: true,
        links,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Search using a search engine
   */
  async search(options: SearchOptions): Promise<SearchResult[]> {
    const { query, engine, limit = 10 } = options;
    const searchUrl = this.getSearchUrl(engine, query);

    await this.navigate(searchUrl);
    await this.wait(BROWSER_CONFIG.SEARCH_WAIT_MS);

    const html = await this.getHtml();
    const results = this.extractSearchResults(engine, html);

    return results.slice(0, limit);
  }

  /**
   * Get search URL for different engines
   */
  private getSearchUrl(engine: SearchEngine, query: string): string {
    const encodedQuery = encodeURIComponent(query);
    switch (engine) {
      case 'google':
        return `https://www.google.com/search?q=${encodedQuery}`;
      case 'bing':
        return `https://www.bing.com/search?q=${encodedQuery}`;
      case 'baidu':
        return `https://www.baidu.com/s?wd=${encodedQuery}`;
      case 'sogou':
        return `https://www.sogou.com/web?query=${encodedQuery}`;
      default:
        throw new Error(`Unsupported search engine: ${engine}`);
    }
  }

  /**
   * Extract search results from HTML
   */
  private extractSearchResults(engine: SearchEngine, html: string): SearchResult[] {
    try {
      switch (engine) {
        case 'google':
          return this.extractGoogleResults(html);
        case 'bing':
          return this.extractBingResults(html);
        case 'baidu':
          return this.extractBaiduResults(html);
        case 'sogou':
          return this.extractSogouResults(html);
        default:
          return [];
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      defaultLogger.warn(`Failed to extract ${engine} search results: ${errorMessage}`);
      return [];
    }
  }

  /**
   * Extract Google search results using cheerio
   */
  private extractGoogleResults(html: string): SearchResult[] {
    const $ = cheerio.load(html);
    const results: SearchResult[] = [];

    // Google uses div.g for search results
    $('div.g').each((_, element) => {
      const $el = $(element);
      const $link = $el.find('a[href]').first();
      const $title = $el.find('h3').first();
      const $snippet = $el.find('div.VwiC3b, div[data-sncf]').first();

      const url = $link.attr('href');
      const title = $title.text().trim();
      const snippet = $snippet.text().trim();

      if (url && title && !url.startsWith('/search')) {
        results.push({ title, url, snippet });
      }
    });

    return results;
  }

  /**
   * Extract Bing search results using cheerio
   */
  private extractBingResults(html: string): SearchResult[] {
    const $ = cheerio.load(html);
    const results: SearchResult[] = [];

    // Bing uses li.b_algo for search results
    $('li.b_algo').each((_, element) => {
      const $el = $(element);
      const $link = $el.find('h2 a').first();
      const $snippet = $el.find('p, div.b_caption p').first();

      const url = $link.attr('href');
      const title = $link.text().trim();
      const snippet = $snippet.text().trim();

      if (url && title) {
        results.push({ title, url, snippet });
      }
    });

    return results;
  }

  /**
   * Extract Baidu search results using cheerio
   */
  private extractBaiduResults(html: string): SearchResult[] {
    const $ = cheerio.load(html);
    const results: SearchResult[] = [];

    // Baidu uses div.result for search results
    $('div.result').each((_, element) => {
      const $el = $(element);
      const $link = $el.find('h3 a').first();
      const $snippet = $el.find('div.c-abstract, div[class*="abstract"]').first();

      const url = $link.attr('href');
      const title = $link.text().trim();
      const snippet = $snippet.text().trim();

      if (url && title) {
        results.push({ title, url, snippet });
      }
    });

    return results;
  }

  /**
   * Extract Sogou search results using cheerio
   */
  private extractSogouResults(html: string): SearchResult[] {
    const $ = cheerio.load(html);
    const results: SearchResult[] = [];

    // Sogou uses div.vrwrap for search results
    $('div.vrwrap').each((_, element) => {
      const $el = $(element);
      const $link = $el.find('h3 a').first();
      const $snippet = $el.find('p.str-text, p[class*="text"]').first();

      const url = $link.attr('href');
      const title = $link.text().trim();
      const snippet = $snippet.text().trim();

      if (url && title) {
        results.push({ title, url, snippet });
      }
    });

    return results;
  }

  /**
   * Extract links from HTML
   */
  private extractLinks(html: string, baseUrl: string): string[] {
    const linkRegex = /<a[^>]+href=["']([^"']+)["']/gi;
    const links: string[] = [];
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
      try {
        const link = new URL(match[1], baseUrl).href;
        if (!links.includes(link)) {
          links.push(link);
        }
      } catch {
        // Ignore invalid links
      }
    }

    return links;
  }

}

export * from './types.js';
export * from './config.js';

/**
 * Types for agent-browser integration
 */

export interface AgentBrowserOptions {
  /**
   * Session name for the browser instance
   */
  sessionName?: string;
  /**
   * Headless mode
   */
  headless?: boolean;
  /**
   * Timeout in milliseconds
   */
  timeout?: number;
}

export interface ScrapeResult {
  success: boolean;
  markdown?: string;
  html?: string;
  rawHtml?: string;
  links?: string[];
  screenshot?: string;
  error?: string;
}

export interface MapResult {
  success: boolean;
  links?: string[];
  error?: string;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  content?: string;
}

export type SearchEngine = 'bing' | 'google' | 'baidu' | 'sogou';

export interface SearchOptions {
  query: string;
  engine: SearchEngine;
  limit?: number;
}

/**
 * Options for scraping a URL
 * Simplified version of ScrapeInput from schemas.ts to avoid circular dependencies
 */
export interface ScrapeOptions {
  formats?: Array<'markdown' | 'html' | 'rawHtml' | 'links' | 'screenshot' | 'screenshot@fullPage' | 'extract'>;
  onlyMainContent?: boolean;
  includeTags?: string[];
  excludeTags?: string[];
  waitFor?: number;
  timeout?: number;
  mobile?: boolean;
  skipTlsVerification?: boolean;
  removeBase64Images?: boolean;
}

/**
 * Options for mapping URLs
 */
export interface MapOptions {
  search?: string;
  includeSubdomains?: boolean;
  limit?: number;
}

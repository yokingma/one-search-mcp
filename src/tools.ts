import { SearchSchema, MapSchema, ScrapeSchema, ExtractSchema } from './schemas.js';

// Tool definitions following MCP SDK v1.25+ pattern
export const SEARCH_TOOL = {
  name: 'one_search',
  description: 'Search and retrieve content from web pages. Returns SERP results by default (url, title, description).',
  schema: SearchSchema,
} as const;

export const MAP_TOOL = {
  name: 'one_map',
  description: 'Discover URLs from a starting point. Can use both sitemap.xml and HTML link discovery.',
  schema: MapSchema,
} as const;

export const SCRAPE_TOOL = {
  name: 'one_scrape',
  description: 'Scrape a single webpage with advanced options for content extraction. Supports various formats including markdown, HTML, and screenshots. Can execute custom actions like clicking or scrolling before scraping.',
  schema: ScrapeSchema,
} as const;

export const EXTRACT_TOOL = {
  name: 'one_extract',
  description: 'Extract structured information from web pages using LLM. Supports both cloud AI and self-hosted LLM extraction.',
  schema: ExtractSchema,
} as const;

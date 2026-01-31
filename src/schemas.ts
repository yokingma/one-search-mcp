import { z } from 'zod/v3';

// Search Schema
export const SearchSchema = z.object({
  query: z.string().describe('Search query string'),
  limit: z.number().optional().describe('Maximum number of results to return (default: 10)'),
  language: z.string().optional().describe('Language code for search results (default: auto)'),
  categories: z.enum([
    'general',
    'news',
    'images',
    'videos',
    'it',
    'science',
    'map',
    'music',
    'files',
    'social_media',
  ]).optional().describe('Categories to search for (default: general)'),
  timeRange: z.enum([
    'all',
    'day',
    'week',
    'month',
    'year',
  ]).optional().describe('Time range for search results (default: all)'),
});

export type SearchInput = z.infer<typeof SearchSchema>;

// Map Schema
export const MapSchema = z.object({
  url: z.string().describe('Starting URL for URL discovery'),
  search: z.string().optional().describe('Optional search term to filter URLs'),
  ignoreSitemap: z.boolean().optional().describe('Skip sitemap.xml discovery and only use HTML links'),
  sitemapOnly: z.boolean().optional().describe('Only use sitemap.xml for discovery, ignore HTML links'),
  includeSubdomains: z.boolean().optional().describe('Include URLs from subdomains in results'),
  limit: z.number().optional().describe('Maximum number of URLs to return'),
});

export type MapInput = z.infer<typeof MapSchema>;

// Action Schema for Scrape
const ActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('wait'),
    milliseconds: z.number().describe('Time to wait in milliseconds'),
  }),
  z.object({
    type: z.literal('click'),
    selector: z.string().describe('CSS selector for the target element'),
  }),
  z.object({
    type: z.literal('screenshot'),
    fullPage: z.boolean().optional().describe('Take full page screenshot'),
  }),
  z.object({
    type: z.literal('write'),
    selector: z.string().describe('CSS selector for the target element'),
    text: z.string().describe('Text to write'),
  }),
  z.object({
    type: z.literal('press'),
    key: z.string().describe('Key to press'),
  }),
  z.object({
    type: z.literal('scroll'),
    direction: z.enum(['up', 'down']).describe('Scroll direction'),
  }),
  z.object({
    type: z.literal('scrape'),
  }),
  z.object({
    type: z.literal('executeJavascript'),
    script: z.string().describe('JavaScript code to execute'),
  }),
]);

// Scrape Schema
export const ScrapeSchema = z.object({
  url: z.string().describe('The URL to scrape'),
  formats: z.array(z.enum([
    'markdown',
    'html',
    'rawHtml',
    'screenshot',
    'links',
    'screenshot@fullPage',
    'extract',
  ])).optional().describe("Content formats to extract (default: ['markdown'])"),
  onlyMainContent: z.boolean().optional().describe('Extract only the main content, filtering out navigation, footers, etc.'),
  includeTags: z.array(z.string()).optional().describe('HTML tags to specifically include in extraction'),
  excludeTags: z.array(z.string()).optional().describe('HTML tags to exclude from extraction'),
  waitFor: z.number().optional().describe('Time in milliseconds to wait for dynamic content to load'),
  timeout: z.number().optional().describe('Maximum time in milliseconds to wait for the page to load'),
  actions: z.array(ActionSchema).optional().describe('List of actions to perform before scraping'),
  extract: z.object({
    schema: z.record(z.any()).optional().describe('Schema for structured data extraction'),
    systemPrompt: z.string().optional().describe('System prompt for LLM extraction'),
    prompt: z.string().optional().describe('User prompt for LLM extraction'),
  }).optional().describe('Configuration for structured data extraction'),
  mobile: z.boolean().optional().describe('Use mobile viewport'),
  skipTlsVerification: z.boolean().optional().describe('Skip TLS certificate verification'),
  removeBase64Images: z.boolean().optional().describe('Remove base64 encoded images from output'),
  location: z.object({
    country: z.string().optional().describe('Country code for geolocation'),
    languages: z.array(z.string()).optional().describe('Language codes for content'),
  }).optional().describe('Location settings for scraping'),
});

export type ScrapeInput = z.infer<typeof ScrapeSchema>;

// Extract Schema
export const ExtractSchema = z.object({
  urls: z.array(z.string()).describe('List of URLs to extract information from'),
  prompt: z.string().optional().describe('Prompt for the LLM extraction'),
  systemPrompt: z.string().optional().describe('System prompt for LLM extraction'),
  schema: z.record(z.any()).optional().describe('JSON schema for structured data extraction'),
  allowExternalLinks: z.boolean().optional().describe('Allow extraction from external links'),
  enableWebSearch: z.boolean().optional().describe('Enable web search for additional context'),
  includeSubdomains: z.boolean().optional().describe('Include subdomains in extraction'),
});

export type ExtractInput = z.infer<typeof ExtractSchema>;

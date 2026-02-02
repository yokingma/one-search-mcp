#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ISearchRequestOptions, ISearchResponse, SearchProvider } from './interface.js';
import { bingSearch, duckDuckGoSearch, searxngSearch, tavilySearch, localSearch, googleSearch, zhipuSearch, exaSearch, bochaSearch } from './search/index.js';
import { SEARCH_TOOL, EXTRACT_TOOL, SCRAPE_TOOL, MAP_TOOL } from './tools.js';
import type { SearchInput, MapInput, ScrapeInput, ExtractInput } from './schemas.js';
import { AgentBrowser } from './libs/agent-browser/index.js';
import dotenvx from '@dotenvx/dotenvx';
import { SafeSearchType } from 'duck-duck-scrape';

// Load environment variables silently (suppress all output)
dotenvx.config({ quiet: true });

// search api
const SEARCH_API_URL = process.env.SEARCH_API_URL;
const SEARCH_API_KEY = process.env.SEARCH_API_KEY;
const SEARCH_PROVIDER: SearchProvider = process.env.SEARCH_PROVIDER as SearchProvider ?? 'local';

// search query params
const SAFE_SEARCH = process.env.SAFE_SEARCH ?? 0;
const LIMIT = process.env.LIMIT ?? 10;
const CATEGORIES = process.env.CATEGORIES ?? 'general';
const ENGINES = process.env.ENGINES ?? 'all';
const FORMAT = process.env.FORMAT ?? 'json';
const LANGUAGE = process.env.LANGUAGE ?? 'auto';
const TIME_RANGE = process.env.TIME_RANGE ?? '';
const DEFAULT_TIMEOUT = process.env.TIMEOUT ?? 10000;

// Server implementation using MCP SDK v1.25+ pattern
const server = new McpServer(
  {
    name: 'one-search-mcp',
    version: '1.1.2',
  },
  {
    capabilities: {
      tools: {},
      logging: {},
    },
  },
);

const searchDefaultConfig = {
  limit: Number(LIMIT),
  categories: CATEGORIES,
  format: FORMAT,
  safesearch: SAFE_SEARCH,
  language: LANGUAGE,
  engines: ENGINES,
  time_range: TIME_RANGE,
  timeout: DEFAULT_TIMEOUT,
};

// Helper function to wrap tool handlers with logging and error handling
function createToolHandler<TInput, TOutput>(
  toolName: string,
  handler: (args: TInput) => Promise<TOutput>,
) {
  return async (args: TInput) => {
    const startTime = Date.now();

    try {
      await server.sendLoggingMessage({
        level: 'info',
        data: `[${new Date().toISOString()}] Request started for tool: [${toolName}]`,
      });

      const result = await handler(args);

      await server.sendLoggingMessage({
        level: 'info',
        data: `[${new Date().toISOString()}] Request completed in ${Date.now() - startTime}ms`,
      });

      return result;
    } catch (error) {
      await server.sendLoggingMessage({
        level: 'error',
        data: `[${new Date().toISOString()}] Error in ${toolName}: ${error}`,
      });
      const msg = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text' as const,
            text: msg,
          },
        ],
        isError: true,
      };
    }
  };
}

// Register tools using the new registerTool API
server.registerTool(
  SEARCH_TOOL.name,
  {
    description: SEARCH_TOOL.description,
    inputSchema: SEARCH_TOOL.schema,
  },
  createToolHandler(SEARCH_TOOL.name, async (args: SearchInput) => {
    const { results, success } = await processSearch({
      ...args,
      apiKey: SEARCH_API_KEY ?? '',
      apiUrl: SEARCH_API_URL,
    });

    if (!success) {
      throw new Error('Failed to search');
    }

    const resultsText = results.map((result) => (
      `Title: ${result.title}
URL: ${result.url}
Description: ${result.snippet}
${result.markdown ? `Content: ${result.markdown}` : ''}`
    ));

    return {
      content: [
        {
          type: 'text' as const,
          text: resultsText.join('\n\n'),
        },
      ],
    };
  }),
);

server.registerTool(
  SCRAPE_TOOL.name,
  {
    description: SCRAPE_TOOL.description,
    inputSchema: SCRAPE_TOOL.schema,
  },
  createToolHandler(SCRAPE_TOOL.name, async (args: ScrapeInput) => {
    const { url, ...scrapeArgs } = args;
    const { content } = await processScrape(url, scrapeArgs);

    return {
      content,
    };
  }),
);

server.registerTool(
  MAP_TOOL.name,
  {
    description: MAP_TOOL.description,
    inputSchema: MAP_TOOL.schema,
  },
  createToolHandler(MAP_TOOL.name, async (args: MapInput) => {
    const { content } = await processMapUrl(args.url, args);

    return {
      content,
    };
  }),
);

server.registerTool(
  EXTRACT_TOOL.name,
  {
    description: EXTRACT_TOOL.description,
    inputSchema: EXTRACT_TOOL.schema,
  },
  createToolHandler(EXTRACT_TOOL.name, async (args: ExtractInput) => {
    const { content } = await processExtract(args);

    return {
      content,
    };
  }),
);

// Business logic functions
async function processSearch(args: ISearchRequestOptions): Promise<ISearchResponse> {
  switch (SEARCH_PROVIDER) {
    case 'searxng': {
      // merge default config with args
      const params = {
        ...searchDefaultConfig,
        ...args,
        apiKey: SEARCH_API_KEY,
      };

      // but categories and language have higher priority (ENV > args).
      const { categories, language } = searchDefaultConfig;

      if (categories) {
        params.categories = categories;
      }
      if (language) {
        params.language = language;
      }
      return await searxngSearch(params);
    }
    case 'tavily': {
      return await tavilySearch({
        ...searchDefaultConfig,
        ...args,
        apiKey: SEARCH_API_KEY,
      });
    }
    case 'bing': {
      return await bingSearch({
        ...searchDefaultConfig,
        ...args,
        apiKey: SEARCH_API_KEY,
      });
    }
    case 'duckduckgo': {
      const safeSearch = args.safeSearch ?? 0;
      const safeSearchOptions = [SafeSearchType.STRICT, SafeSearchType.MODERATE, SafeSearchType.OFF];
      return await duckDuckGoSearch({
        ...searchDefaultConfig,
        ...args,
        apiKey: SEARCH_API_KEY,
        safeSearch: safeSearchOptions[safeSearch],
      });
    }
    case 'local': {
      return await localSearch({
        ...searchDefaultConfig,
        ...args,
      });
    }
    case 'google': {
      return await googleSearch({
        ...searchDefaultConfig,
        ...args,
        apiKey: SEARCH_API_KEY,
        apiUrl: SEARCH_API_URL,
      });
    }
    case 'zhipu': {
      return await zhipuSearch({
        ...searchDefaultConfig,
        ...args,
        apiKey: SEARCH_API_KEY,
      });
    }
    case 'exa': {
      return await exaSearch({
        ...searchDefaultConfig,
        ...args,
        apiKey: SEARCH_API_KEY,
      });
    }
    case 'bocha': {
      return await bochaSearch({
        ...searchDefaultConfig,
        ...args,
        apiKey: SEARCH_API_KEY,
      });
    }
    default:
      throw new Error(`Unsupported search provider: ${SEARCH_PROVIDER}`);
  }
}

async function processScrape(url: string, args: Omit<ScrapeInput, 'url'>): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  result: any;
  success: boolean;
}> {
  const browser = new AgentBrowser({
    headless: true,
    timeout: 30000,
  });

  try {
    const res = await browser.scrapeUrl(url, args);

    if (!res.success) {
      throw new Error(`Failed to scrape: ${res.error}`);
    }

    const content: string[] = [];

    if (res.markdown) {
      content.push(res.markdown);
    }

    if (res.rawHtml) {
      content.push(res.rawHtml);
    }

    if (res.links) {
      content.push(res.links.join('\n'));
    }

    if (res.screenshot) {
      content.push(res.screenshot);
    }

    if (res.html) {
      content.push(res.html);
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: content.join('\n\n') || 'No content found',
        },
      ],
      result: res,
      success: true,
    };
  } finally {
    await browser.close();
  }
}

async function processMapUrl(url: string, args: Omit<MapInput, 'url'>): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  result: string[];
  success: boolean;
}> {
  const browser = new AgentBrowser({
    headless: true,
    timeout: 30000,
  });

  try {
    const res = await browser.mapUrl(url, args);

    if (!res.success) {
      throw new Error(`Failed to map: ${res.error}`);
    }

    if (!res.links) {
      throw new Error(`No links found from: ${url}`);
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: res.links.join('\n').trim(),
        },
      ],
      result: res.links,
      success: true,
    };
  } finally {
    await browser.close();
  }
}

async function processExtract(args: ExtractInput): Promise<{
  content: Array<{ type: 'text'; text: string }>;
}> {
  const { urls, prompt, systemPrompt, schema } = args;
  const browser = new AgentBrowser({
    headless: true,
    timeout: 30000,
  });

  try {
    const results: string[] = [];

    // Extract content from each URL
    for (const url of urls) {
      try {
        const res = await browser.scrapeUrl(url, {
          formats: ['markdown'],
          onlyMainContent: true,
        });

        if (res.success && res.markdown) {
          results.push(`## Content from ${url}\n\n${res.markdown}`);
        } else {
          results.push(`## Failed to extract from ${url}\n\nError: ${res.error || 'Unknown error'}`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        results.push(`## Failed to extract from ${url}\n\nError: ${errorMsg}`);
      }
    }

    let finalText = results.join('\n\n---\n\n');

    // Add extraction instructions if provided
    if (prompt || systemPrompt || schema) {
      const instructions: string[] = [];

      if (systemPrompt) {
        instructions.push(`System Instructions: ${systemPrompt}`);
      }

      if (prompt) {
        instructions.push(`Extraction Task: ${prompt}`);
      }

      if (schema) {
        instructions.push(`Expected Schema:\n${JSON.stringify(schema, null, 2)}`);
      }

      finalText = `${instructions.join('\n\n')}\n\n---\n\nExtracted Content:\n\n${finalText}`;
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: finalText,
        },
      ],
    };
  } finally {
    await browser.close();
  }
}

async function runServer(): Promise<void> {
  try {
    // Do NOT write to stdout before connecting - it will break MCP protocol
    const transport = new StdioServerTransport();
    await server.connect(transport);

    // Now we can send logging messages through MCP protocol
    await server.sendLoggingMessage({
      level: 'info',
      data: 'OneSearch MCP server started',
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Error starting server: ${msg}\n`);
    process.exit(1);
  }
}

// run server
runServer().catch((error) => {
  const msg = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Error running server: ${msg}\n`);
  process.exit(1);
});

// export types
export * from './interface.js';

#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SearchProvider } from './interface.js';
import { SEARCH_TOOL, EXTRACT_TOOL, SCRAPE_TOOL, MAP_TOOL } from './tools.js';
import type { SearchInput, MapInput, ScrapeInput, ExtractInput } from './schemas.js';
import { AgentBrowser } from './libs/agent-browser/index.js';
import { activeBrowserRegistry } from './libs/agent-browser/registry.js';
import { runBrowserTask } from './libs/agent-browser/task.js';
import { processSearch } from './search/process-search.js';
import { extractContentFromUrls } from './extract/process-extract.js';
import { createToolHandler } from './server/tool-handler.js';
import { installProcessCleanupHandlers } from './server/process-cleanup.js';
import { installStdioDisconnectCleanupHandlers } from './server/stdio-cleanup.js';
import dotenvx from '@dotenvx/dotenvx';

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
    version: '1.2.1',
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
  safeSearch: Number(SAFE_SEARCH) as 0 | 1 | 2,
  language: LANGUAGE,
  engines: ENGINES,
  timeRange: TIME_RANGE,
  timeout: DEFAULT_TIMEOUT,
};

installProcessCleanupHandlers(process, async () => {
  await activeBrowserRegistry.cleanup();
});

installStdioDisconnectCleanupHandlers(
  process.stdin,
  async () => {
    await activeBrowserRegistry.cleanup();
    await server.close();
  },
  (code) => {
    process.exit(code);
  },
);

// Register tools using the new registerTool API
server.registerTool(
  SEARCH_TOOL.name,
  {
    description: SEARCH_TOOL.description,
    inputSchema: SEARCH_TOOL.schema,
  },
  createToolHandler(SEARCH_TOOL.name, async (args: SearchInput, context) => {
    const { results, success } = await processSearch(
      args,
      {
        provider: SEARCH_PROVIDER,
        apiKey: SEARCH_API_KEY ?? '',
        apiUrl: SEARCH_API_URL,
        defaultSearchOptions: searchDefaultConfig,
      },
      context.signal,
    );

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
  }, { logMessage: (message) => server.sendLoggingMessage(message) }),
);

server.registerTool(
  SCRAPE_TOOL.name,
  {
    description: SCRAPE_TOOL.description,
    inputSchema: SCRAPE_TOOL.schema,
  },
  createToolHandler(SCRAPE_TOOL.name, async (args: ScrapeInput, context) => {
    const { url, ...scrapeArgs } = args;
    const { content } = await processScrape(url, scrapeArgs, context.signal);

    return {
      content,
    };
  }, { logMessage: (message) => server.sendLoggingMessage(message) }),
);

server.registerTool(
  MAP_TOOL.name,
  {
    description: MAP_TOOL.description,
    inputSchema: MAP_TOOL.schema,
  },
  createToolHandler(MAP_TOOL.name, async (args: MapInput, context) => {
    const { content } = await processMapUrl(args.url, args, context.signal);

    return {
      content,
    };
  }, { logMessage: (message) => server.sendLoggingMessage(message) }),
);

server.registerTool(
  EXTRACT_TOOL.name,
  {
    description: EXTRACT_TOOL.description,
    inputSchema: EXTRACT_TOOL.schema,
  },
  createToolHandler(EXTRACT_TOOL.name, async (args: ExtractInput, context) => {
    const { content } = await processExtract(args, context.signal);

    return {
      content,
    };
  }, { logMessage: (message) => server.sendLoggingMessage(message) }),
);

async function processScrape(url: string, args: Omit<ScrapeInput, 'url'>, signal?: AbortSignal): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  result: unknown;
  success: boolean;
}> {
  const browser = new AgentBrowser({
    headless: true,
    timeout: 30000,
  });

  return await runBrowserTask({
    browser,
    signal,
    task: async () => {
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
    },
  });
}

async function processMapUrl(url: string, args: Omit<MapInput, 'url'>, signal?: AbortSignal): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  result: string[];
  success: boolean;
}> {
  const browser = new AgentBrowser({
    headless: true,
    timeout: 30000,
  });

  return await runBrowserTask({
    browser,
    signal,
    task: async () => {
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
    },
  });
}

async function processExtract(args: ExtractInput, signal?: AbortSignal): Promise<{
  content: Array<{ type: 'text'; text: string }>;
}> {
  const { urls } = args;
  const browser = new AgentBrowser({
    headless: true,
    timeout: 30000,
  });

  return await runBrowserTask({
    browser,
    signal,
    task: async () => {
      const finalText = await extractContentFromUrls(urls, browser);

      return {
        content: [
          {
            type: 'text' as const,
            text: finalText,
          },
        ],
      };
    },
  });
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

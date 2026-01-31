# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OneSearch MCP Server is a Model Context Protocol (MCP) server implementation that provides web search, scraping, and content extraction capabilities. It integrates with multiple search providers (SearXNG, Tavily, DuckDuckGo, Bing) and supports local browser-based search using Puppeteer.

## Development Commands

### Development
```bash
npm run dev
```
Runs the server in development mode with hot reload using tsx and dotenvx for environment variables.

### Build
```bash
npm run build
```
Builds the project using tsup, generating both CommonJS and ESM outputs in the `dist/` directory. The build also makes the main entry point executable.

### Linting
```bash
npm run lint        # Check for linting errors
npm run lint:fix    # Auto-fix linting errors
```

### Running Built Server
```bash
npm start
```
Runs the compiled server from `dist/index.js`.

## Architecture

### Core Components

**Main Entry Point** ([src/index.ts](src/index.ts))
- Initializes the MCP server using `@modelcontextprotocol/sdk`
- Configures StdioServerTransport for communication
- Registers three main tools: `one_search`, `one_scrape`, `one_map`
- Routes tool requests to appropriate handlers based on configured search provider

**Search Provider Architecture**
The server supports multiple search providers through a pluggable architecture:
- **searxng**: Self-hosted meta-search engine ([src/search/searxng.ts](src/search/searxng.ts))
- **tavily**: Cloud-based search API ([src/search/tavily.ts](src/search/tavily.ts))
- **bing**: Microsoft Bing Search API ([src/search/bing.ts](src/search/bing.ts))
- **duckduckgo**: DuckDuckGo search ([src/search/duckduckgo.ts](src/search/duckduckgo.ts))
- **local**: Browser-based search using Puppeteer ([src/search/local.ts](src/search/local.ts))

The active provider is determined by the `SEARCH_PROVIDER` environment variable (defaults to `local`).

**Local Browser Search** ([src/libs/browser-search/](src/libs/browser-search/))
A stealth-mode web search library built on Puppeteer that:
- Supports multiple search engines: Bing, Google, Baidu, Sogou
- Uses `puppeteer-core` with local browser installations
- Implements browser finding logic ([src/libs/browser/finder.ts](src/libs/browser/finder.ts)) to locate Chrome/Chromium
- Extracts content using Readability algorithm ([src/libs/browser-search/readability.ts](src/libs/browser-search/readability.ts))
- Converts HTML to Markdown using Turndown
- Manages browser lifecycle and request queuing

**Firecrawl Integration**
The server integrates with Firecrawl for advanced scraping:
- `one_scrape`: Single page scraping with format options (markdown, HTML, screenshots)
- `one_map`: URL discovery via sitemap.xml and HTML link extraction
- Supports both cloud and self-hosted Firecrawl instances

### Tool Definitions

All MCP tools are defined in [src/tools.ts](src/tools.ts):
- `SEARCH_TOOL`: Web search with configurable parameters
- `SCRAPE_TOOL`: Advanced page scraping with actions and extraction
- `MAP_TOOL`: URL discovery and sitemap crawling
- `EXTRACT_TOOL`: LLM-based structured data extraction (defined but not implemented in handler)

### Configuration

Environment variables control behavior:
- `SEARCH_PROVIDER`: Which search backend to use (default: `local`)
- `SEARCH_API_URL`: API endpoint for SearXNG
- `SEARCH_API_KEY`: API key for Tavily/Bing
- `FIRECRAWL_API_URL`: Firecrawl API endpoint
- `FIRECRAWL_API_KEY`: Firecrawl API key
- Search parameters: `LIMIT`, `CATEGORIES`, `ENGINES`, `LANGUAGE`, `TIME_RANGE`, `SAFE_SEARCH`

### Build System

- **TypeScript**: Strict mode enabled with NodeNext module resolution
- **tsup**: Bundles to both CJS and ESM formats with sourcemaps and minification
- **Module Type**: ESM (type: "module" in package.json)
- **File Extensions**: All imports use `.js` extensions (TypeScript convention for ESM)

## Key Implementation Details

### Search Flow
1. Request arrives via MCP protocol
2. `processSearch()` routes to appropriate provider based on `SEARCH_PROVIDER`
3. Provider-specific search function executes
4. For `local` provider: BrowserSearch launches Puppeteer, scrapes search results, extracts content
5. Results formatted as text with title, URL, description, and optional markdown content

### Browser Management
- Local browser search uses `puppeteer-core` (no bundled Chromium)
- Browser finder checks common installation paths for Chrome/Chromium
- Browser lifecycle managed per search request (launch → search → close)
- Queue system prevents concurrent browser operations

### Error Handling
- All tool handlers wrapped in try-catch with logging
- Errors returned as MCP responses with success: false
- Server logs all requests, errors, and timing information

## Important Notes

- The `one_extract` tool is defined but not implemented in the CallToolRequestSchema handler
- Local search requires a local browser installation (Chrome, Chromium, etc.)
- The project uses ESM modules exclusively - all imports must include `.js` extensions
- Puppeteer has known issues with tsx (see README troubleshooting)

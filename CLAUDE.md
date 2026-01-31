# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OneSearch MCP Server is a Model Context Protocol (MCP) server implementation that provides web search, scraping, and content extraction capabilities. It integrates with multiple search providers (SearXNG, Tavily, DuckDuckGo, Bing) and supports local browser-based search using agent-browser with Playwright.

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

- Initializes the MCP server using `@modelcontextprotocol/sdk` v1.25+
- Configures StdioServerTransport for communication
- Registers four main tools: `one_search`, `one_scrape`, `one_map`, `one_extract`
- Routes tool requests to appropriate handlers based on configured search provider

#### Search Provider Architecture

The server supports multiple search providers through a pluggable architecture:
- **searxng**: Self-hosted meta-search engine ([src/search/searxng.ts](src/search/searxng.ts))
- **tavily**: Cloud-based search API ([src/search/tavily.ts](src/search/tavily.ts))
- **bing**: Microsoft Bing Search API ([src/search/bing.ts](src/search/bing.ts))
- **duckduckgo**: DuckDuckGo search ([src/search/duckduckgo.ts](src/search/duckduckgo.ts))
- **local**: Browser-based search using agent-browser ([src/search/local.ts](src/search/local.ts))

The active provider is determined by the `SEARCH_PROVIDER` environment variable (defaults to `local`).

#### Agent Browser Integration

The server uses `agent-browser` with Playwright for browser automation ([src/libs/agent-browser/](src/libs/agent-browser/)):

- Supports multiple search engines: Bing, Google, Baidu, Sogou
- Uses `playwright-core` with local browser installations
- Extracts content using Readability algorithm and converts to Markdown using Turndown
- Manages browser lifecycle and provides methods for navigation, scraping, and URL mapping
- Implements search result extraction for different search engines

### Tool Definitions

All MCP tools are defined in [src/tools.ts](src/tools.ts):

- `SEARCH_TOOL`: Web search with configurable parameters
- `SCRAPE_TOOL`: Advanced page scraping with format options (markdown, HTML, screenshots)
- `MAP_TOOL`: URL discovery via HTML link extraction
- `EXTRACT_TOOL`: Structured data extraction from multiple URLs with optional LLM prompts

### Configuration

Environment variables control behavior:

- `SEARCH_PROVIDER`: Which search backend to use (default: `local`)
- `SEARCH_API_URL`: API endpoint for SearXNG
- `SEARCH_API_KEY`: API key for Tavily/Bing
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
4. For `local` provider: AgentBrowser launches Playwright, scrapes search results, extracts content
5. Results formatted as text with title, URL, description, and optional markdown content

### Browser Management

- Local browser operations use `agent-browser` with `playwright-core` (no bundled Chromium)
- Browser must be installed separately via `agent-browser install` or `npx playwright install chromium`
- Browser lifecycle managed per request (launch → operation → close)
- AgentBrowser class provides unified interface for navigation, scraping, and extraction

### Scraping and Extraction

- `processScrape()`: Scrapes a single URL with configurable formats (markdown, HTML, links, screenshots)
- `processMapUrl()`: Discovers URLs from a starting page with filtering options
- `processExtract()`: Extracts content from multiple URLs with optional LLM prompts and schemas
- All operations use the AgentBrowser wrapper for consistent behavior

### Error Handling
- All tool handlers wrapped in try-catch with logging
- Errors returned as MCP responses with success: false
- Server logs all requests, errors, and timing information

## Important Notes

- All four MCP tools (`one_search`, `one_scrape`, `one_map`, `one_extract`) are fully implemented
- Local search and scraping require a local Chromium installation (Chrome, Chromium, Edge, etc.)
- The project uses ESM modules exclusively - all imports must include `.js` extensions
- MCP SDK v1.25+ uses the new `registerTool` API pattern instead of `setRequestHandler`
- Zod schemas provide runtime validation and type inference for all tool inputs

## Migration from Firecrawl

Version 1.0.11+ removed Firecrawl integration in favor of `agent-browser`:

- **Benefits**: No external API dependencies, better privacy, no API costs, local control
- **Requirements**: Must install Chromium browser locally
- **Breaking Changes**: `FIRECRAWL_API_URL` and `FIRECRAWL_API_KEY` environment variables removed
- **Functionality**: All scraping and mapping features preserved with similar or better performance

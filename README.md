# 🚀 OneSearch MCP Server: Web Search & Crawl & Scraper & Extract

A Model Context Protocol (MCP) server implementation that integrates with Searxng/Tavily/DuckDuckGo/Bing for web search, local browser search, and scraping capabilities with agent-browser.

## Features

- Web Search, scrape, crawl and extract content from websites.
- Support multiple search engines and web scrapers: **SearXNG**, **Tavily**, **DuckDuckGo**, **Bing**, etc.
- **Local web search** (browser search), support multiple search engines: **Bing**, **Google**, **Baidu**, **Sogou**, etc.
  - Use `agent-browser` + `playwright-core` for browser automation.
  - Free, no API keys required.
- **Enabled tools:** `one_search`, `one_scrape`, `one_map`, `one_extract`
- Support for self-hosted: SearXNG, etc. (see [Deploy](./deploy/README.md))

## Migration from v1.0.10 and Earlier

**Breaking Changes in v1.0.11:**

- **Firecrawl Removed**: The Firecrawl integration has been removed in favor of `agent-browser`, which provides similar functionality without requiring external API services.
- **New Browser Requirement**: You must install Chromium browser (see Prerequisites section).
- **Environment Variables**: `FIRECRAWL_API_URL` and `FIRECRAWL_API_KEY` are no longer used.

**What Changed:**

- `one_scrape` and `one_map` now use `agent-browser` with Playwright instead of Firecrawl
- `one_extract` tool is now fully implemented for structured data extraction from multiple URLs
- All browser-based operations are now handled locally, providing better privacy and no API costs

**Migration Steps:**

1. Install Chromium browser (see Prerequisites)
2. Remove `FIRECRAWL_API_URL` and `FIRECRAWL_API_KEY` from your environment variables
3. Update to the latest version: `npm install -g one-search-mcp@latest`

## Prerequisites

**Browser Requirement**: This server uses `agent-browser` for web scraping and local search, which requires a Chromium-based browser.

**Good News**: The server will automatically detect and use browsers already installed on your system:

- ✅ Google Chrome
- ✅ Microsoft Edge
- ✅ Chromium
- ✅ Google Chrome Canary

**If you don't have any of these browsers installed**, you can:

```bash
# Option 1: Install Google Chrome (Recommended)
# Download from: https://www.google.com/chrome/

# Option 2: Install Microsoft Edge
# Download from: https://www.microsoft.com/edge

# Option 3: Install via Playwright
npx playwright install chromium
```

## Installation

### Installing via Smithery

To install OneSearch for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@yokingma/one-search):

```bash
npx -y @smithery/cli install @yokingma/one-search --client claude
```

### Manual Installation

```shell
# Manually install (Optional)
npm install -g one-search-mcp
```

```shell
# using npx
env SEARCH_API_URL=http://127.0.0.1:8080 npx -y one-search-mcp
```

## Environment Variables

**Search Engine:**

- **SEARCH_PROVIDER** (Optional): The search provider to use, supports `searxng`, `duckduckgo`, `bing`, `tavily`, `local`, default is `local`.
- **SEARCH_API_URL** (Optional): The URL of the SearxNG API, required for `searxng`.
- **SEARCH_API_KEY** (Optional): The API key for the search provider, required for `tavily`, `bing`.

```ts
// supported search providers
export type SearchProvider = 'searxng' | 'duckduckgo' | 'bing' | 'tavily' | 'local';
```

## Running on Cursor

Your `mcp.json` file will look like this:

```json
{
  "mcpServers": {
    "one-search-mcp": {
      "command": "npx",
      "args": ["-y", "one-search-mcp"],
      "env": {
        "SEARCH_PROVIDER": "local",
        "SEARCH_API_URL": "http://127.0.0.1:8080",
        "SEARCH_API_KEY": "YOUR_API_KEY"
      }
    }
  }
}
```

## Running on Windsurf

Add this to your `./codeium/windsurf/model_config.json` file:

```json
{
  "mcpServers": {
    "one-search-mcp": {
      "command": "npx",
      "args": ["-y", "one-search-mcp"],
      "env": {
        "SEARCH_PROVIDER": "local",
        "SEARCH_API_URL": "http://127.0.0.1:8080",
        "SEARCH_API_KEY": "YOUR_API_KEY"
      }
    }
  }
}
```

## Self-host

Local deployment of SearXNG, please refer to [Deploy](./deploy/README.md)

## Troubleshooting

### Browser not found error

If you see an error like "Browser not found", the server couldn't detect any installed Chromium-based browser. Please install one of the following:

- **Google Chrome**: <https://www.google.com/chrome/>
- **Microsoft Edge**: <https://www.microsoft.com/edge>
- **Chromium**: <https://www.chromium.org/getting-involved/download-chromium/>

Or install via Playwright:

```bash
npx playwright install chromium
```

### Other issues

- [ReferenceError]: __name is not defined: This is because Puppeteer has problems with `tsx`, [esbuild#1031](https://github.com/evanw/esbuild/issues/1031)

## License

MIT License - see [LICENSE](./LICENSE) file for details.

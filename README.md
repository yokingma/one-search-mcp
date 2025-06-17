[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/yokingma-one-search-mcp-badge.png)](https://mseep.ai/app/yokingma-one-search-mcp)

# 🚀 OneSearch MCP Server: Web Search & Crawl & Scraper & Extract

A Model Context Protocol (MCP) server implementation that integrates with Searxng/Tavily/DuckDuckGo/Bing for web search, local browser search, and scraping capabilities with Firecrawl.

## Features

- Web Search, scrape, crawl and extract content from websites.
- Support multiple search engines and web scrapers: **SearXNG**, **Firecrawl**, **Tavily**, **DuckDuckGo**, **Bing**, etc.
- **Local web search** (browser search), support multiple search engines: **Bing**, **Google**, **Baidu**, **Sogou**, etc.
  - Use `puppeteer-core` to scrape content from websites.
  - You should have a local browser installed, such as `Chromium`, `Google Chrome`, `Google Chrome Canary`, etc.
  - Free, no keys required.
- **Enabled tools:** `one_search`, `one_scrape`, `one_map`
- Support for self-hosted: SearXNG, Firecrawl, etc. (see [Deploy](./deploy/README.md))

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
env SEARCH_API_URL=http://127.0.0.1:8080 FIRECRAWL_API_URL=http://127.0.0.1:3002 npx -y one-search-mcp
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

**Firecrawl:**

- FIRECRAWL_API_URL (Optional): The URL of the Firecrawl API, required for `firecrawl`.
- FIRECRAWL_API_KEY (Optional): The API key for the Firecrawl API, required for `firecrawl` if using cloud service.

## Running on Cursor

Your `mcp.json` file will look like this:

```json
{
  "mcpServers": {
    "one-search-mcp": {
      "command": "npx",
      "args": ["-y", "one-search-mcp"],
      "env": {
        "SEARCH_PROVIDER": "searxng",
        "SEARCH_API_URL": "http://127.0.0.1:8080",
        "SEARCH_API_KEY": "YOUR_API_KEY",
        "FIRECRAWL_API_URL": "http://127.0.0.1:3002",
        "FIRECRAWL_API_KEY": "YOUR_API_KEY"
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
        "SEARCH_PROVIDER": "searxng",
        "SEARCH_API_URL": "http://127.0.0.1:8080",
        "SEARCH_API_KEY": "YOUR_API_KEY",
        "FIRECRAWL_API_URL": "http://127.0.0.1:3002",
        "FIRECRAWL_API_KEY": "YOUR_API_KEY"
      }
    }
  }
}
```

## Self-host

Local deployment of SearXNG and Firecrawl, please refer to [Deploy](./deploy/README.md)

## Troubleshooting

- [ReferenceError]: __name is not defined: This is because Puppeteer has problems with `tsx`, [esbuild#1031](https://github.com/evanw/esbuild/issues/1031)

## License

MIT License - see [LICENSE](./LICENSE) file for details.

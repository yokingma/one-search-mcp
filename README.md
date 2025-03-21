# 🚀 OneSearch MCP Server: Web Search & Crawl & Scraper & Extract

A Model Context Protocol (MCP) server implementation that integrates with Searxng/Firecrawl/Tavily for web search and scraping capabilities.

## Features

- Web Search, scrape, crawl and extract content from websites.
- Support multiple search engines and web scrapers: SearXNG, Firecrawl, Tavily, etc.
- Support for self-hosted: SearXNG, Firecrawl, etc. (see [Deploy](./deploy/README.md))
- **Enabled tools:** `one_search`, `one_scrape`

## Installation

```shell
# Manually install (Optional)
npm install -g one-search-mcp
```

```shell
# using npx
env SEARCH_API_URL=http://127.0.0.1:8080 FIRECRAWL_API_URL=http://127.0.0.1:3002 npx -y one-search-mcp
```

## Environment Variables

**Search:**

- SEARCH_PROVIDER (Optional): The search provider to use, either `searxng` or `tavily`, default is `searxng`.
- SEARCH_API_URL (Optional): The URL of the SearxNG API, required for `searxng`.
- SEARCH_API_KEY (Optional): The API key for the search provider, required for `tavily`.

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

## License

MIT License - see [LICENSE](./LICENSE) file for details.

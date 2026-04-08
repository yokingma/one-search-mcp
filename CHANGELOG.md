# Changelog

## 2026-04-08

- Bumped the project version uniformly to `1.2.0` across npm/package metadata and MCP runtime metadata.
- Simplified Docker release tags so GitHub tag builds now publish only the exact semver tag and `latest`.
- Documented the Docker image tagging policy in the README.
- Refactored Tavily search to use the official `@tavily/core` SDK instead of the hand-written HTTP client.
- Normalized Tavily search options so only supported `topic` and `timeRange` values are forwarded to the SDK, avoiding malformed `400 Bad Request` payloads.
- Added regression coverage for Tavily SDK option mapping and pre-aborted request handling.
- Downgraded `one_extract` into a content preprocessing tool that returns scraped text blocks instead of advertising built-in LLM structured extraction.

## 2026-04-06

- Bumped the project version uniformly to `1.1.3` across npm/package metadata and MCP runtime metadata.
- Disabled tsup sourcemap output so published npm tarballs no longer include `.map` artifacts.
- Added abort-aware browser task handling for browser-backed tool paths so MCP request cancellation can close active `AgentBrowser` instances before normal request teardown.
- Updated `runBrowserTask(...)` to short-circuit pre-aborted requests and reject immediately on mid-flight abort instead of waiting for the underlying task promise to settle.
- Routed MCP handler `signal` propagation through search, scrape, map, and extract flows, including the local search provider.
- Moved search-provider dispatch into a shared module and propagated request abort signals through every provider branch, not just `local`.
- Reworked remote search providers to use abort-aware request wiring; `tavily` and `exa` now use direct HTTP requests so upstream calls can be canceled immediately.
- Added a global active-browser registry plus `SIGINT` / `SIGTERM` / `beforeExit` cleanup hooks so process shutdown can best-effort close any still-tracked browser instances.
- Added stdio disconnect cleanup so browser-backed requests are torn down and the MCP process exits when stdin closes during an in-flight request.
- Added Vitest regression coverage for browser-task abort short-circuiting and full search-provider signal propagation.

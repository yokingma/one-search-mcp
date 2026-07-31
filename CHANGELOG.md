# Changelog

## 2026-07-31

- Fixed DuckDuckGo safe-search dispatch so the documented shared values now map correctly: `0` to off, `1` to moderate, and `2` to strict.
- Added regression coverage for every DuckDuckGo safe-search level at the shared search-dispatch boundary.
- Added a guarded npm release flow that runs tests, lint, build, and package verification before publishing.
- Normalized npm repository metadata so publishing no longer needs npm to correct the package manifest.
- Shortened the MCP Registry description to comply with its 100-character validation limit.

## 2026-07-03

- Bumped the project version uniformly to `1.2.3` across npm/package metadata and MCP runtime metadata.
- Tightened the `one_map` tool interface so it now exposes only the implemented browser-backed link-discovery options and rejects removed fields such as `ignoreSitemap` and `sitemapOnly` at the schema seam.
- Tightened the `one_scrape` tool interface so it now exposes only the implemented scrape options, rejects removed fields such as `onlyMainContent`, `extract`, `location`, and other unimplemented browser options at the schema seam, and restores `actions` only as a bounded pre-scrape interaction surface.
- Added request-scoped scrape timeout wiring so `one_scrape.timeout` now controls navigation and initial page-load timeout for that tool call.
- Added request-scoped TLS override wiring so `one_scrape.skipTlsVerification` now launches the browser context with HTTPS certificate verification disabled for that scrape call only.
- Implemented real `screenshot@fullPage` behavior so `one_scrape` now returns a full-page screenshot instead of silently falling back to the viewport-sized capture.
- Restored `one_scrape.actions` as serial pre-scrape actions that support bounded interactions such as `wait`, `click`, `write`, `press`, and `scroll`, while keeping `executeJavascript` available as an advanced action.
- Added serial action execution before content capture so scrape actions now run in order and fail fast instead of being silently ignored.
- Fixed `executeJavascript` actions to run through Playwright's direct string evaluation path so promise-returning scripts are awaited instead of being wrapped in a lossy page-level `eval(...)`.
- Added explicit `allowExecuteJavascript: true` gating so advanced page-script execution remains available without being silently bundled into the bounded scrape-action contract.
- Split the `one_scrape` schema into an inspector-friendly MCP input object plus runtime cross-field validation so `tools/list` keeps exposing all scrape fields while `executeJavascript` gating still applies.
- Clarified AI-facing tool and schema descriptions so `executeJavascript` explicitly calls out the `allowExecuteJavascript: true` requirement.
- Updated browser-backed tool descriptions to match the narrowed interface and added regression coverage for strict schema rejection plus the newly supported scrape capabilities.

## 2026-06-26

- Upgraded the direct MCP runtime dependency from `@modelcontextprotocol/sdk@^1.25.3` to `^1.29.0` to clear the known shared server/transport isolation advisory on the project's primary MCP SDK.
- Added regression coverage that enforces a minimum patched `@modelcontextprotocol/sdk` version in `package.json` so future dependency drift cannot silently reintroduce the vulnerable range.
- Bumped the project version uniformly to `1.2.2` across npm/package metadata and MCP runtime metadata.
- Added `npm run inspector` and `npm run inspector:build` helpers for launching the official MCP Inspector against the source or built server entrypoints.
- Added `ALLOW_PRIVATE_NETWORK` so browser-backed tools still block private, loopback, and link-local targets by default but can be explicitly re-enabled for trusted internal scraping deployments.
- Documented the new runtime flag in `server.json` and the README, and emit a startup warning when the flag is enabled.
- Added regression coverage for the opt-in private-network path in both direct URL validation and redirect-time request guarding.
- Expanded SSRF regression coverage to lock in blocked IPv6 ranges and subresource request revalidation.

## 2026-06-25

- Hardened browser-backed URL fetching against SSRF by validating outbound `http` / `https` targets before navigation and rejecting loopback, RFC1918 private, carrier-grade NAT, link-local, and IPv6 unique-local addresses.
- Added shared browser network protection so `one_scrape`, `one_map`, and `one_extract` revalidate redirect and subresource requests instead of trusting only the initial URL.
- Added regression coverage for blocked IP literals, private DNS resolutions, mixed public/private DNS answers, and blocked redirect targets.
- Updated the stdio disconnect integration test to use a public HTTPS target so lifecycle coverage no longer depends on a loopback URL that is now intentionally rejected.

## 2026-04-16

- Bumped the project version uniformly to `1.2.1` across npm/package metadata and MCP runtime metadata.
- Fixed `searxng` provider routing so `processSearch(...)` now forwards `SEARCH_API_URL` / `apiUrl` into `searxngSearch(...)` again.
- Added a regression test covering `apiUrl` propagation for the `searxng` branch in shared search dispatch.
- Fixed `searxngSearch(...)` to use a protocol-correct `GET` request with URL query parameters instead of sending a `POST` request with an empty JSON body.
- Normalized `searxng` time-range forwarding so unsupported values like `all` are omitted instead of being blindly passed through.
- Improved `searxng` error handling so non-2xx responses and invalid JSON responses now surface clear provider-specific errors.
- Added provider-level regression tests for `searxng` request construction and error handling.

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

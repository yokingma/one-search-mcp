# Patterns

## Shared Safe-Search Semantics

- Preserve the shared search contract across providers: `safeSearch` values mean `0` off, `1` moderate, and `2` strict.
- Map those documented levels explicitly to each provider's native values, and cover all three values in dispatch tests so provider enum ordering cannot invert the public API.

## Honest Browser-Backed Tool Schemas

- Browser-backed MCP tool schemas must only expose behavior that the current wrapper implementation actually honors.
- If a browser-backed tool drops previously ignored fields, make the schema strict so removed fields fail at the seam instead of being silently discarded.
- If a tool needs cross-field validation, keep the MCP-exposed `inputSchema` as a plain object schema so `tools/list` and inspector-style form generation still receive concrete properties; run the cross-field validation as a separate runtime parse.
- When a tool advertises a browser capability such as timeout control, TLS override, or full-page screenshots, wire it directly into the browser launch or navigation path for that specific request instead of documenting a pseudo-feature.
- If a browser-backed tool exposes page actions, keep the standard actions as a small bounded pre-scrape interaction surface, execute them serially, and fail fast on the first action error before any content capture starts.
- If a tool also exposes caller-provided JavaScript, require an explicit opt-in field at the schema seam and document it as advanced or unsafe instead of bounded; AI-facing descriptions should say when that opt-in must be `true`.
- When executing caller-provided JavaScript in the page context, prefer Playwright's direct `page.evaluate(string)` support over wrapping the script in a manual `eval(...)` helper so promise-returning scripts are awaited correctly.

## Runtime Dependency Security Floors

- Direct runtime dependencies with known security advisories should be bumped to a patched floor as soon as the project confirms the upgraded path still builds and passes targeted lifecycle tests.
- When a runtime dependency floor matters for security, add an automated metadata test that enforces the minimum acceptable version range from `package.json` so a later downgrade fails in CI before publish.
- For MCP transport dependencies, pair version-floor checks with at least one real startup or lifecycle verification path so dependency upgrades prove both security posture and protocol usability.

## Abort-Aware Browser Tasks

- Any code path that creates an `AgentBrowser` should run through `runBrowserTask(...)`.
- `runBrowserTask(...)` must short-circuit immediately when the request signal is already aborted and must race the running task against request abort so callers do not wait for stale browser work to finish.
- `runBrowserTask(...)` binds the current MCP `AbortSignal` to browser cleanup and guarantees `browser.close()` is only executed once.
- `runBrowserTask(...)` also registers the browser in the global active-browser registry for process-level fallback cleanup.
- Tool handlers should accept the MCP request context and pass `context.signal` down to any browser-backed operation instead of relying only on `finally` cleanup.

## Browser SSRF Guard

- Browser navigation must validate the initial URL before calling `page.goto(...)`.
- Any browser page used for scraping or mapping must install a request-level guard so redirects and subresource requests are revalidated before they hit the network.
- Allowed browser targets should be limited to `http` / `https` and must reject loopback, RFC1918 private, carrier-grade NAT, link-local, and IPv6 unique-local addresses after DNS resolution.
- Treat mixed DNS answers as unsafe if any resolved address falls into a blocked range.
- Regression coverage for the browser SSRF guard should explicitly exercise blocked IPv6 targets and a subresource request path, not only initial URLs or redirects.
- If a deployment genuinely needs internal scraping, keep the default-deny behavior and require an explicit environment flag such as `ALLOW_PRIVATE_NETWORK=true` instead of silently weakening the default guard.
- When private-network access is enabled, surface a clear runtime warning so operators understand the widened trust boundary.

## Abort-Aware Search Providers

- Search dispatch should live in a pure helper so provider routing can be regression-tested without starting the MCP server.
- Every search provider branch must receive the caller `AbortSignal`; do not special-case `local` and forget remote providers.
- Every provider branch must also forward the provider-specific configuration it depends on, such as `apiUrl` for `searxng` and `google`, instead of rebuilding a partial params object.
- Match the upstream provider protocol exactly: if parameters are encoded in the URL, use `GET`; if the provider expects form data, send a form body. Do not mix `POST` with URL query parameters plus `Content-Type: application/json`.
- Normalize provider-specific option ranges before sending requests. If a shared tool schema allows values that an upstream provider does not support, omit unsupported values instead of guessing a mapping.
- HTTP-based providers should merge the caller signal with provider timeouts into one request signal so either condition cancels the upstream request immediately.
- Check `response.ok` before parsing the response body, and throw a provider-specific HTTP error before any JSON decoding. If JSON decoding still fails on a successful response, throw a clear invalid-response error.
- If a third-party SDK does not expose request cancellation, prefer a direct HTTP implementation over wrapping the SDK in `Promise.race(...)`, because returning early without canceling still burns upstream quota and local resources.

## Publish Artifacts

- Package version metadata must stay aligned across `package.json`, `package-lock.json`, `server.json`, and the MCP runtime version exposed from `src/index.ts`.
- Published npm artifacts should exclude sourcemaps unless there is an explicit debugging requirement to ship them.
- Docker release builds should publish only the exact semver tag and `latest`; avoid floating major-only or major-minor tags that can silently retarget existing deployments.
- Keep local MCP debugging entrypoints discoverable through stable `npm` scripts so developers can launch the official MCP Inspector against both source and built server entrypoints without reconstructing nested `npx` commands by hand.

## Tavily Search Integration

- Tavily search should use the official `@tavily/core` SDK instead of a hand-written HTTP client.
- Only forward Tavily options that the SDK explicitly supports; unsupported `categories` values should be omitted so Tavily falls back to its default topic.
- Do not send empty `timeRange` values to Tavily. Normalize optional fields first so the request payload only contains valid values.
- If a Tavily-backed request is already aborted before execution starts, fail fast before creating the SDK client or making an outbound request.

## Extract Tool Scope

- `one_extract` is a content preprocessing tool, not a built-in LLM extraction pipeline.
- The extract input should only accept the URLs to preprocess; do not expose prompt, schema, or other pseudo-LLM options unless the server actually owns a model-backed extraction stage.
- Extract responses should return scraped text blocks that downstream agents or applications can pass into their own models.

## Process Shutdown Cleanup

- Install process cleanup handlers once at service startup.
- Keep the shutdown scope narrow and predictable: `SIGINT`, `SIGTERM`, and `beforeExit`.
- Shutdown cleanup should be idempotent because multiple exit hooks can fire in the same lifecycle.
- The process-level cleanup path is a fallback; request-scoped abort cleanup remains the primary path.

## Stdio Disconnect Cleanup

- Stdio-based MCP servers should also treat `stdin end/close` as a hard disconnect signal.
- On stdio disconnect, run browser cleanup once and then exit the process explicitly so in-flight timers or browser tasks cannot keep the server alive after the client is gone.
- This path is separate from signal-driven shutdown because a parent process can disappear without sending `SIGTERM`.

## Test Coverage for Lifecycle Fixes

- Request-lifecycle changes should have a failing regression test before implementation.
- Handler or dispatch tests should verify signal propagation for every affected branch.
- Browser lifecycle tests should verify abort-triggered cleanup happens before the main task resolves and that aborted tasks are rejected without waiting for task completion.

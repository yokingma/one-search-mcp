# Patterns

## Abort-Aware Browser Tasks

- Any code path that creates an `AgentBrowser` should run through `runBrowserTask(...)`.
- `runBrowserTask(...)` must short-circuit immediately when the request signal is already aborted and must race the running task against request abort so callers do not wait for stale browser work to finish.
- `runBrowserTask(...)` binds the current MCP `AbortSignal` to browser cleanup and guarantees `browser.close()` is only executed once.
- `runBrowserTask(...)` also registers the browser in the global active-browser registry for process-level fallback cleanup.
- Tool handlers should accept the MCP request context and pass `context.signal` down to any browser-backed operation instead of relying only on `finally` cleanup.

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

# Agent Guide

## Start Here

- Check `git status --short` before editing. Preserve unrelated user changes.
- Read `CONTEXT.md`, `CONTEXT-MAP.md`, and relevant `docs/adr/` files when they exist; proceed silently when they do not.
- Track implementation work in `.scratch/<feature-slug>/`. Follow `docs/agents/issue-tracker.md` and use only the labels in `docs/agents/triage-labels.md`.
- Use the vocabulary defined by the domain context. Surface conflicts with an ADR instead of silently overriding it.

## Project Map

- `src/index.ts`: MCP server startup, tool registration, and process cleanup.
- `src/tools.ts`: public MCP tool schemas and descriptions.
- `src/search/`: provider dispatch and provider implementations.
- `src/libs/agent-browser/`: browser lifecycle, navigation, and content extraction.
- `test/`: Vitest behavior and lifecycle coverage.

## Implementation Rules

- Keep TypeScript strict and ESM-only. Local TypeScript imports use `.js` extensions.
- Treat MCP tool schemas as public API. Expose only behavior that the implementation honors, and reject removed or invalid inputs at the schema boundary.
- Route every browser task through `runBrowserTask(...)`; propagate the MCP request `AbortSignal` to browser and search operations.
- Preserve the shared `safeSearch` contract: `0` off, `1` moderate, `2` strict. Map it explicitly for each provider.
- Keep browser navigation protected by the SSRF guard. Private-network access remains opt-in through configuration.
- `one_extract` preprocesses content only. Do not add prompt, schema, or model-extraction inputs unless the server gains that execution capability.
- Do not introduce compatibility shims or undocumented configuration behavior without an explicit requirement.

## Tests And Verification

- For a behavior change or bug fix, write a failing Vitest regression test first. Test contracts rather than implementation details.
- Run the narrowest relevant test while iterating, then run `npm test`, `npm run lint`, and `npm run build` before handoff when the change scope warrants it.
- Browser lifecycle changes require coverage for cancellation, cleanup, and signal propagation. Provider changes must cover every affected dispatch branch.

## Release And Documentation

- Keep the package version aligned across `package.json`, `package-lock.json`, `server.json`, and the runtime version exposed by `src/index.ts`.
- Keep the npm repository URL in canonical `git+https://...git` form and the `server.json` description within MCP Registry limits.
- For executable changes, update `CHANGELOG.md` and `PATTERNS.md` when the user-visible behavior or a reusable implementation rule changes. Documentation-only changes do not require them.
- Validate a release with `npm run release:check` before publishing.

# Core Engineering Rules

## Mission

Build secure, SSR-safe, maintainable Angular code with clear architecture boundaries.

## Priority Order

1. Security
2. SSR correctness
3. Functional correctness
4. Performance
5. Developer experience

When trade-offs are required, follow this order.

## Workflow Requirements

1. Understand the requested behavior and impacted layer(s).
2. Identify architecture boundaries before coding.
3. Make the smallest safe change possible.
4. Add or update tests for changed behavior.
5. Run relevant verification commands.
6. Ensure no new SonarLint issues in modified code.

## TypeScript Standards

- Use strict typing and explicit domain types.
- `any` and `unknown` types are forbidden in application code.
- Type function parameters, return types, DTOs, and state models explicitly.
- Prefer precise union/generic types over broad fallback types.
- Prefer immutable updates and pure functions.
- Keep public APIs stable unless a breaking change is required.
- Avoid hidden side effects in utility functions.

## Code Change Standards

- Do not refactor unrelated code unless it blocks the task.
- Keep diffs focused and reviewable.
- Preserve existing naming and style conventions.
- Add concise comments only for non-obvious logic.
- Do not leave dead code or commented-out implementations.

## Error Handling Standards

- Fail safely and predictably.
- Return actionable error states to UI layers.
- Never expose stack traces, secrets, or internal server details to users.
- Prefer typed error models over string-only errors.

## Security Baseline

- Treat all external input as untrusted.
- Never trust query params, route params, local storage, or API payloads.
- Never hardcode secrets, tokens, API keys, or credentials.
- Avoid dynamic code execution patterns.

## PostgreSQL-Aware API Contract Rules

Frontend does not execute SQL, but must preserve backend safety assumptions:

- Keep identifiers opaque (UUID/string IDs) and never build SQL-like expressions.
- Keep filters typed and whitelist-driven.
- Keep sorting fields constrained to known allowed values.
- Keep date/time formats explicit and deterministic (ISO 8601).
- Never assume backend will sanitize malformed inputs for us.

## Validation And Quality Gates

For meaningful changes, run as many as applicable:

- `npm run build`
- `npm run test`
- SonarLint analysis in IDE on touched files
- `npx snyk test` when dependency changes are introduced

## Definition Of Complete Change

A change is complete only when all are true:

1. Requirement is implemented.
2. SSR behavior is preserved.
3. Security posture is not degraded.
4. Relevant tests are updated and passing.
5. SonarLint issues introduced by the change are resolved.

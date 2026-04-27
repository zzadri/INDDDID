# Security Rules

## Baseline

Security is non-negotiable. Every change must preserve or improve security posture.

## Input And Data Handling

- Treat all client, route, query, storage, and API data as untrusted.
- Validate and normalize inputs early.
- Encode output in context (HTML, URL, attribute, script) when needed.
- Avoid dynamic evaluation patterns.

## Authentication And Session

- Prefer secure, server-managed sessions or httpOnly cookies.
- Never store sensitive tokens in long-lived browser storage unless required.
- Never log secrets, tokens, or PII.
- Handle unauthorized states predictably and safely.

## Authorization

- Enforce authorization server-side; frontend checks are UX-only.
- Keep guard logic explicit and least-privilege aligned.
- Do not expose privileged UI actions without robust server authorization.

## API And Transport

- Use HTTPS-only API endpoints in production environments.
- Keep request payloads minimal and explicit.
- Reject malformed filters/sorts on the client before sending when possible.
- Avoid over-fetching sensitive data.
- `axios` package is forbidden; use Angular `HttpClient` and interceptors.

## XSS And Injection Defense

- Avoid unsafe HTML insertion.
- Use Angular template binding and sanitization defaults.
- Avoid bypassing sanitizer unless strictly necessary and reviewed.
- Never build SQL-like expressions in frontend payloads.

## PostgreSQL-Aware Frontend Rules

Backend uses PostgreSQL. Frontend must preserve safety assumptions:

- Keep filter operators constrained to an allowlist.
- Keep sort fields constrained to known schema fields.
- Keep pagination numeric and bounded.
- Send structured filter objects, never raw query fragments.

## Dependency Security

- Run `npx snyk test` on dependency updates.
- Use `npx snyk code test` for code-level findings when available.
- Prioritize remediation of high/critical issues.
- Prefer patched versions and minimal-risk upgrades.

## Secure Defaults

- Default to deny on unknown/invalid states.
- Fail closed for permission-sensitive UI.
- Keep feature flags explicit and documented.

## Incident Hygiene

- If a potential vulnerability is found, stop feature work and triage.
- Document impact, affected areas, and remediation plan.
- Add regression tests to prevent recurrence.
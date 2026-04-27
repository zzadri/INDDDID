# Testing Rules

## Testing Goals

- Prevent regressions.
- Verify business behavior, not implementation details.
- Protect SSR correctness and hydration stability.
- Keep security-sensitive flows covered.

## Framework And Tooling

- Use project-standard Angular unit testing setup (`ng test`).
- Keep tests deterministic and independent.
- Do not rely on network access in unit tests.

## What Must Be Tested

1. New business logic in use-cases and domain.
2. Critical component interactions and state transitions.
3. Error handling and edge cases.
4. Security-sensitive user flows.
5. SSR-specific behavior when rendering logic changes.

## Unit Test Rules

- Prefer small focused tests with one clear expectation group.
- Mock infrastructure boundaries, not domain behavior.
- Verify outputs, state transitions, and side effects.
- Avoid over-mocking framework internals.

## Integration Test Rules

- Test application + infrastructure wiring where risk is high.
- Validate mapper correctness for API payload transformations.
- Validate contract assumptions for IDs, filters, and pagination.

## SSR Test Rules

- Ensure server render does not crash without browser globals.
- Verify no hydration mismatch when content is deterministic.
- Verify fallback behavior for browser-only features.
- Verify request-scoped state does not leak across requests.

## Security Test Rules

- Test sanitization and encoding-sensitive paths.
- Test invalid input handling for params/query/form payloads.
- Test auth and permission UX behavior for protected routes.

## Coverage And Quality Expectations

- Cover changed code paths, including unhappy paths.
- Prioritize high-risk logic over superficial coverage growth.
- Add regression tests for any fixed bug.

## Test Naming

- Use explicit names that describe behavior and expected result.
- Keep arrange/act/assert intent clear.

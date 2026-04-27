# SonarLint Rules

## Objective

Keep modified code SonarLint-clean and reduce technical debt continuously.

## Severity Policy

- Blocker/Critical issues: must be fixed before merge.
- Major issues: fix in the same change unless justified.
- Minor issues: fix when low effort; otherwise document rationale.

## Scope Policy

- Always analyze changed files.
- When refactoring shared utilities, analyze impacted callers too.
- Prefer fixing root causes over suppressing warnings.

## Common Rule Categories To Enforce

1. Reliability: avoid null/undefined hazards, dead code, unreachable branches.
2. Security: avoid unsafe APIs, weak randomness, injection-prone patterns.
3. Maintainability: reduce complexity and duplicated logic.
4. Readability: meaningful naming and clear control flow.

## TypeScript/Angular Focus Areas

- No ignored promises without intent.
- No unsafe type assertions without guard.
- No hidden side effects in getters/computed values.
- Keep component methods cohesive and small.
- Avoid deeply nested conditionals in templates and logic.

## Remediation Workflow

1. Triage by severity and exploitability.
2. Fix highest risk issues first.
3. Re-run SonarLint on touched files.
4. Add tests for bug-prone or security-prone fixes.
5. Document any accepted risk explicitly.

## Suppression Policy

- Do not suppress warnings by default.
- Suppression requires rationale and issue tracking reference.
- Temporary suppression must have clear removal follow-up.

## Definition Of Done (Quality)

- No new blocker/critical Sonar issues.
- New major issues are fixed or formally justified.
- Complexity and duplication do not regress in touched areas.
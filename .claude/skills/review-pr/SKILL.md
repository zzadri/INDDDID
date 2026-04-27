---
name: review-pr
description: "Use when reviewing pull requests for bugs, regressions, SSR breakage, security risks, SonarLint issues, and missing tests."
argument-hint: "Provide PR scope or changed files"
user-invocable: true
---

# Pull Request Review Workflow

## Use This Skill When

- Reviewing any non-trivial PR.
- Validating release-critical changes.
- Performing final merge readiness checks.

## Review Priorities

1. Security vulnerabilities.
2. SSR correctness and hydration stability.
3. Functional regressions.
4. Architecture violations.
5. Missing tests and observability gaps.
6. Performance and maintainability issues.

## Step-by-Step Process

1. Understand intent and changed files.
2. Group changes by architecture layer.
3. Validate contract and type changes.
4. Check SSR-sensitive code paths.
5. Check security-sensitive data paths.
6. Validate test coverage for critical paths.
7. Triage SonarLint findings on changed files.
8. Produce severity-ordered findings.

## Findings Severity Model

- High: merge-blocking risk (security/data-loss/SSR break).
- Medium: important but non-blocking in some contexts.
- Low: maintainability/readability with low immediate risk.

## Required Output

1. `Findings` first, ordered high -> low.
2. `Evidence` with file/line pointers when possible.
3. `Recommendation` with concrete fix for each finding.
4. `Open Questions` for unclear assumptions.
5. `Residual Risk` summary if merge proceeds.

If no findings: explicitly state no blocking findings and list residual testing gaps.

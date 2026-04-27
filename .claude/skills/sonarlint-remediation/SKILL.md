---
name: sonarlint-remediation
description: "Use when SonarLint reports bugs, vulnerabilities, or code smells and you need a disciplined triage and remediation workflow."
argument-hint: "Provide findings list or affected files"
user-invocable: true
---

# SonarLint Remediation Workflow

## Use This Skill When

- SonarLint reports new findings.
- Preparing a PR for merge with quality gates.
- Reducing technical debt in high-churn code.

## Triage Process

1. Collect findings for modified files.
2. Sort by severity and exploitability.
3. Group by root-cause pattern.
4. Plan smallest safe fix set.

## Fix Strategy

- Fix blocker and critical first.
- Fix major findings unless there is a documented reason not to.
- Address repeated patterns centrally when safe.
- Avoid broad refactors unrelated to root causes.

## Angular And SSR Specific Checks

- Null/undefined safety in template-bound values.
- Async error paths in services/stores.
- Complexity in components and route handlers.
- Browser global usage in SSR paths.

## Verification Loop

1. Apply fix.
2. Re-run SonarLint.
3. Run tests/build when behavior may have changed.
4. Confirm no new SSR or security regression.

## Output Contract

Provide:

1. Findings fixed with file references.
2. Findings deferred with rationale.
3. Residual risk and recommended follow-up.
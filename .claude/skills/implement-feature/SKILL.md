---
name: implement-feature
description: "Use when implementing or refactoring Angular features in this repo, including domain/application/infrastructure/presentation layering, SSR safety, tests, and quality gates."
argument-hint: "Describe feature goal, impacted user flow, and constraints"
user-invocable: true
---

# Implement Feature Workflow

## Use This Skill When

- Building a new feature.
- Refactoring behavior in an existing feature.
- Adding cross-layer behavior from domain to UI.

## Required Inputs

1. User-facing behavior to implement.
2. Affected feature and route scope.
3. Constraints: security, SSR, performance, deadlines.

## Step-by-Step Process

1. Clarify intent and impacted layers.
2. Identify domain model and use-case changes.
3. Define or adjust application ports and DTOs.
4. Implement infrastructure adapters/mappers.
5. Implement presentation wiring (page/store/component).
6. Verify SSR safety for all changed execution paths.
7. Add or update tests for changed behavior.
8. Run build/test and resolve SonarLint findings.

## Architecture Checklist

- Domain has no Angular/infrastructure dependencies.
- Application depends on domain and ports only.
- Infrastructure implements application ports.
- Presentation does not bypass use-cases for business logic.

## SSR Checklist

- No unguarded browser globals in server paths.
- No request data leakage across users.
- No hydration mismatch from non-deterministic rendering.
- Express SSR flow remains intact.

## Security Checklist

- Input handling is explicit and validated.
- No unsafe HTML/data handling introduced.
- API payloads preserve PostgreSQL-safe contract constraints.
- Sensitive states and errors are not leaked.

## Quality Checklist

- `npm run build` passes.
- `npm run test` passes.
- SonarLint shows no new blocker/critical issues.
- Any accepted risk is documented.

## Deliverable Format

When reporting completion, include:

1. What changed by layer.
2. Why the solution respects architecture.
3. SSR/security checks performed.
4. Tests updated and current status.

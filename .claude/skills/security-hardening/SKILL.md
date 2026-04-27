---
name: security-hardening
description: "Use when improving frontend security, reducing attack surface, validating auth flows, hardening API interactions, and applying OWASP-aligned mitigations."
argument-hint: "Describe threat or surface to harden"
user-invocable: true
---

# Security Hardening Workflow

## Use This Skill When

- Implementing security-sensitive features.
- Responding to a vulnerability finding.
- Hardening auth, routing, forms, or API interactions.

## Threat-Driven Process

1. Identify assets, actors, and trust boundaries.
2. Enumerate likely attack vectors.
3. Rank risk by impact and likelihood.
4. Apply mitigations in descending risk order.
5. Validate with tests and static analysis.

## Frontend Hardening Checklist

- Input validation and normalization are explicit.
- Output rendering avoids unsafe HTML insertion.
- Sensitive data is minimized in logs and storage.
- Route guards and state handling are least-privilege aligned.
- Error messages do not leak internals.

## API Contract Hardening Checklist

- IDs, pagination, filters, and sort fields are typed.
- Free-form filter expressions are rejected.
- Unknown filter operators are blocked.
- Date/time formats are explicit and validated.

## PostgreSQL-Aware Guardrails

Frontend does not write SQL, but must not undermine backend protections:

- Never send SQL-like fragments.
- Keep sort/filter inputs constrained to allowlists.
- Preserve server assumptions for injection resistance.

## Verification

- Run tests for security-sensitive paths.
- Run SonarLint analysis on modified files.
- Run `npx snyk code test` when available.
- Document any residual risk and compensating controls.
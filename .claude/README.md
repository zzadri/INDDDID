# .claude Folder Guide

This folder centralizes AI behavior, coding standards, and specialized workflows for
INDDID POC V1 — outil de cartographie dynamique de SI (Angular 17 SPA + Node.js/Express + PostgreSQL).

## Structure

- `CLAUDE.md`: main operating manual loaded first.
- `settings.json`: local permissions and safety defaults.
- `rules/`: always-on engineering rules.
- `skills/`: reusable multi-step workflows.
- `agents/`: specialized personas (review, SonarLint, Snyk).

## Current Focus

- Angular 17.x standalone components, Cytoscape.js canvas modeler.
- SPA served by nginx — pas d'Angular SSR (Universal).
- Backend Express clean architecture (domain / application / infrastructure / presentation).
- Security-by-default engineering (JWT httpOnly cookie, Zod, Helmet, rate-limit).
- SonarLint quality gates.
- Dependency and code vulnerability checks with Snyk.

## How To Use

1. Keep `CLAUDE.md` short and orchestration-focused.
2. Put detailed constraints in `rules/` files.
3. Use `skills/` for repeatable implementation/review playbooks.
4. Use `agents/` for focused analyses :
   - `code-reviewer` : PR risk reviews.
   - `sonarlint-guardian` : static quality/safety issues.
   - `snyk-security-agent` : dependency and code vulnerability audits.

## Maintenance Rules

- Update rule files when project conventions change.
- Keep skills procedural and actionable.
- Keep agent scopes narrow; avoid all-in-one agents.
- Never store secrets or credentials in this folder.
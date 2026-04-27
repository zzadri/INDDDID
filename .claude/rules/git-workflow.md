# Git Workflow Rules

## Branching Strategy (Mandatory)

- Never commit or push directly to `main`.
- Always create a branch from latest `main` using:
  - `Feature/<nom-feature>`
- One branch must cover one clear objective.
- Keep branch names explicit and readable.

Examples:

- `Feature/auth-login`
- `Feature/checkout-coupon`
- `Feature/ssr-product-page`

## Push Policy

- Push only feature branches to remote.
- First push should set upstream:
  - `git push -u origin Feature/<nom-feature>`
- Never force-push `main`.
- If force-push is needed on your own feature branch, use only:
  - `git push --force-with-lease`

## Commit Rules

- Make small, atomic commits with one intent per commit.
- Avoid large mixed commits (feature + refactor + unrelated fixes).
- Avoid noisy commit messages like `wip`, `test`, `fix` alone.
- Prefer Conventional Commits style:
  - `feat(scope): short summary`
  - `fix(scope): short summary`
  - `refactor(scope): short summary`
  - `test(scope): short summary`
  - `chore(scope): short summary`

Examples:

- `feat(auth): add login use-case orchestration`
- `fix(ssr): guard window usage in navbar component`
- `test(home): cover hero banner loading fallback`

## Pre-Push Checklist

Before opening PR or pushing final commits:

1. Rebase/sync with latest `main`.
2. Resolve conflicts cleanly.
3. Run `npm run build`.
4. Run `npm run test`.
5. Ensure SonarLint findings are resolved on changed files.
6. Run `npx snyk test` if dependencies changed.

## Pull Request Rules

- Target branch must be `main`.
- Source branch must be `Feature/<nom-feature>`.
- PR title should be explicit and action-oriented.
- PR description must include:
  1. Problem/Context
  2. Solution summary
  3. SSR impact
  4. Security impact
  5. Test evidence (commands/results)

For UI changes, include screenshots or short visual proof.

## PR Quality Gates

- At least one reviewer approval before merge.
- No unresolved review conversations.
- No failing required checks.
- No known blocker/critical Sonar issues introduced.

## Merge Policy

- Prefer squash merge to keep history readable.
- Delete feature branch after merge.
- Direct commits on `main` are prohibited except explicit emergency approval.
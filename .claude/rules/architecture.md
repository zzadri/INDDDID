# Architecture Rules

## Primary Architecture Style

Use feature-first, clean architecture boundaries inside `src/app/features/<feature>`:

- `domain/`: entities, value objects, pure business rules.
- `application/`: use-cases, ports, DTO contracts.
- `infrastructure/`: API clients, mappers, repository adapters.
- `presentation/`: pages, components, UI store, view models.

## Dependency Direction (Strict)

- `domain` depends on nothing from Angular or infrastructure.
- `application` depends on `domain` and abstract ports only.
- `infrastructure` implements `application` ports.
- `presentation` depends on `application` and UI abstractions.

Forbidden dependencies:

- `domain -> application`
- `domain -> infrastructure`
- `application -> infrastructure concrete classes`

## Domain Rules

- Domain objects are framework-agnostic and serializable.
- Business invariants live in domain models or use-cases.
- Do not place HTTP or storage concerns in domain code.

## Application Rules

- Use-cases orchestrate business workflows.
- Ports define contracts for external dependencies.
- DTOs are explicit and versionable.
- Application layer never imports Angular UI classes.
- Application use-cases own business decisions, not presentation components.

## Infrastructure Rules

- Keep transport details (HTTP, headers, serialization) here.
- Mappers translate API DTO <-> domain models.
- Handle retries/timeouts/fallbacks without leaking infra details upward.

## Presentation Rules

- Components and pages focus on user interaction.
- Keep side effects in dedicated services/stores.
- Prefer unidirectional data flow.
- Keep container vs presentational responsibilities clear.
- Business logic is forbidden in views/templates and must live in domain/application layers.

## Shared Layer Rules

- `shared/` must contain cross-feature primitives only.
- Do not place feature-specific business logic in `shared/`.
- Keep utility functions pure and side-effect free when possible.

## Routing Rules

- Use feature-level route modules/files with lazy loading.
- Keep route guards thin; move business logic to use-cases/services.

## SSR Architecture Rules

- Keep browser-dependent logic isolated from server execution paths.
- Keep request-specific data scoped per request.
- Do not use global mutable singletons for request data.
- Keep server-side rendering deterministic and idempotent.

## PostgreSQL Contract Rules (Frontend Perspective)

- Keep IDs, pagination, filtering, and sorting explicit and typed.
- Restrict filter operators to whitelisted values.
- Do not send free-form query fragments.
- Preserve server contract assumptions that protect PostgreSQL safety.

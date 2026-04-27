# Angular Rules (Angular 17.x)

## Framework Mode

- Use standalone-first Angular architecture.
- Always add `standalone: true` explicitly in decorators (obligatoire en v17, pas encore défaut).
- Prefer feature-level lazy loading for route trees.

## Component Rules

- Keep components small and responsibility-focused.
- Default to `ChangeDetectionStrategy.OnPush`.
- Use `input()` and `output()` signal functions instead of `@Input`/`@Output` decorators (disponible v17.1+).
- Use `computed()` for derived values.
- Keep template logic simple; move complex logic to TypeScript.
- Do not place business logic in components or templates.
- Prefer class/style bindings over `ngClass` and `ngStyle`.

## State Rules

- Use signals for local UI state.
- Use `set()` and `update()` instead of `mutate()`.
- Keep state transitions pure and deterministic.
- Avoid shared mutable global state.

## Template Rules

- Use Angular built-in control flow (`@if`, `@for`, `@switch`) — disponible v17+.
- Use `track` in `@for` loops when possible.
- Prefer `async` pipe for Observable consumption in templates.
- Avoid side-effectful expressions in templates.

## Dependency Injection Rules

- Prefer `inject()` over constructor injection in new code.
- Keep providers scoped intentionally.
- Use `providedIn: 'root'` for app-wide singleton services.

## HTTP Client Rules

- `axios` package is forbidden in this repository.
- Use Angular `HttpClient` with typed request and response models.
- Keep cross-cutting request concerns in interceptors (auth, retry, errors).
- Le `auth.interceptor.ts` injecte automatiquement le cookie JWT sur toutes les requêtes.

## Forms Rules

- Prefer reactive forms.
- Keep form models strongly typed.
- Keep validation explicit and reusable.
- Never trust client-side validation as a security boundary.

## Accessibility Rules

- Meet WCAG AA minimums.
- Ensure focus order and keyboard navigation work.
- Ensure form controls have accessible names and error messaging.
- Ensure contrast and semantic structure are correct.

## Cytoscape.js Canvas Rules

- Toute manipulation Cytoscape (add/remove node/edge, style, layout) reste dans `modeler.component.ts`.
- Ne pas exposer l'instance `cy` hors du composant modeler.
- Les positions (x/y) sont normalisées avant envoi API.
- Les événements Cytoscape (tap, drag, select) ne doivent pas déclencher de détection Angular — utiliser `NgZone.runOutsideAngular()`.

## Performance Rules

- Use route-level lazy loading and code splitting.
- Prevent unnecessary re-renders.
- Keep change detection cost low through pure derived state.
- Use `NgOptimizedImage` for static images when applicable.

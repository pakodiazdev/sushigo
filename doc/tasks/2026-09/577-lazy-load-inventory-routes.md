# ⚡ Introduce route-level lazy loading starting with Inventory

**Labels:** frontend, 🔨 technical-debt, investment: product-engineering, sprint-8

## Description

Complete #441 Technical Task 6 by introducing measurable route-level code splitting, beginning with
the canonical Inventory route tree and establishing a reusable application convention.

The Sprint 6 review deferred this because the application had no route-level lazy-loading pattern;
splitting only two pages during the Inventory navigation rewrite would have created inconsistent
churn without bundle evidence.

## Reason

The initial webapp bundle currently ships every route's page implementation up front, including
Inventory's, so users pay the download/parse cost of pages they may never visit in a given session.
#441 Technical Task 6 called for measurable code splitting, but the Sprint 6 review deferred it for
lack of a route-level lazy-loading convention — splitting only two pages then would have created
inconsistent churn without bundle evidence to justify it. Sprint 7 has since landed the full
canonical `/inventario/*` route set (#570/#573/#574), giving this issue a stable, representative
surface to establish the convention against and measure.

## Objective

Reduce the initial webapp JavaScript payload without changing URLs, permission guards, generated
route behavior, navigation semantics, or user-visible correctness.

## Technical Tasks

- [x] Capture a production-build baseline: entry bundle, Inventory route chunks, total assets, and
      cold navigation behavior.
- [x] Select the TanStack Router-supported lazy-route convention compatible with file-based route
      generation and document it.
- [x] Separate lightweight route metadata/guards/loaders from lazily loaded heavy page components.
- [x] Apply the convention to canonical `/inventario/*` routes, including Sprint 7 Opening Balance,
      Transfers, and Movements routes once available.
- [x] Add one accessible loading/failure boundary for lazy chunks and a recoverable retry path for a
      chunk-load failure.
- [x] Preserve `beforeLoad` permission/Operating Unit guards and legacy redirect behavior.
- [x] Avoid duplicate vendor/shared chunks and circular imports; record post-change bundle evidence.
- [x] Update frontend architecture/development conventions so future routes follow the same pattern.

## Tests

- [x] Route tests prove every canonical and legacy Inventory URL resolves to the same authorized
      destination as before.
- [x] Tests cover lazy loading, chunk-load failure/retry, permission denial, and direct deep links.
- [x] Production build, route generation, TypeScript, ESLint, Vitest, and Inventory Cypress
      navigation remain green.

## Acceptance Criteria

- [x] Inventory page implementations are emitted as lazy route chunks rather than bundled entirely
      in the initial entry chunk.
- [x] Baseline and after measurements demonstrate the payload effect; a result without meaningful
      benefit is documented rather than hidden.
- [x] Permission guards execute before protected content becomes visible.
- [x] Direct links, refresh, browser navigation, and legacy redirects retain behavior.
- [x] The pattern is documented and reusable outside Inventory.

## Dependencies and Parallelization

- Starts after #544 and Sprint 7 route additions #570/#573/#574 to avoid editing the same route
  boundaries twice.
- Can run in parallel with backend movement-line pruning and API test-isolation work.

## Out of Scope

- Server-side rendering, framework replacement, broad component rewrites, or speculative manual
  vendor chunking without measurement.
- UX copy/state standardization, owned by the separate #441 TT4 follow-up.

## 🤔 Assumptions

- **Lazy-route convention: manual `*.lazy.tsx` file split, not the Vite plugin's global
  `autoCodeSplitting` flag.** The issue delegates the choice ("Select the TanStack
  Router-supported lazy-route convention... and document it") without naming one. Both are
  genuinely supported by the installed `@tanstack/router-plugin` (confirmed in
  `node_modules/@tanstack/router-plugin/dist/esm/core/config.d.ts` and
  `.../router-generator/dist/esm/config.js`, which reads a static `tsr.config.json` and merges it
  with the Vite plugin's own inline options). `autoCodeSplitting` needs a `splitBehavior` callback
  to scope itself to only `/inventario/*` — a JS function, which a plain-JSON `tsr.config.json`
  can't express — so using it would either split every route in the app (out of this issue's
  scope, and unmeasured) or desync `npm run generate`'s output from the Vite dev/build output
  (whichever process's config the callback wasn't wired into). The file-based `.lazy.tsx` split
  has no such config-parity risk: which routes are lazy is just which files exist on disk, so
  `npm run generate` and `vite build`/`vite dev` always agree, and the split stays scoped to the
  ten canonical Inventory routes this issue actually measured.

## Investment Type

`investment: product-engineering`

## Time

- **Optimistic:** `3h`
- **Pessimistic:** `7h`
- **Tracked:** `18m` (see Retrospective — session-window artifact, not the real effort)

```json
[
  { "date": "2026-09-13", "start": "19:40", "end": "19:58" }
]
```

## 📊 Retrospective

- **Actual total:** 18m (18m)
- **vs optimistic:** −2h 42m (under)
- **vs pessimistic:** −6h 42m (under)

**Justification:**

The tracked window only covers the time from opening this issue's work session (Phase 2 of the
`/issue-no-review` pipeline: branch creation + the Sessions entry) through PR creation — it does
**not** include the research and implementation work that preceded it in the same run: exploring
`@tanstack/router-plugin`'s code-splitting support, reading all ten `/inventario/*` route files and
their tests, deciding between the manual `.lazy.tsx` split and the global `autoCodeSplitting` flag,
splitting every route file, writing the shared pending/error boundary and its tests, running the
full Vitest suite, and diagnosing/fixing a stale-Vite-process false failure in the dev-lab E2E
stack. All of that real effort happened before the branch/session were opened, an ordering
mismatch specific to this autonomous run rather than a reflection of how little work the change
actually took — the recorded 18m understates the true effort by roughly the length of that
preceding research-and-implementation phase. The Optimistic/Pessimistic estimates (3h–7h) are a
more realistic reflection of the actual work; this Tracked figure is a known artifact of the
pipeline's branch-then-implement ordering, not a claim that the issue took 18 minutes.






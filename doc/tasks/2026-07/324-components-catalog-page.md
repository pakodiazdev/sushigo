# ✨ Task #324: Dev-Only Components Catalog Page for the Frontend Design System

## 📖 Story

**English:**
As a developer, I need a catalog page listing every reusable UI component with live examples, so that I can discover and reuse what already exists instead of duplicating similar components.

**Español:**
Como desarrollador, necesito una página catálogo que liste cada componente UI reutilizable con ejemplos en vivo, para poder descubrir y reutilizar lo que ya existe en lugar de duplicar componentes similares.

---

## Context

The webapp already has ~20 reusable UI components under `src/components/ui/` (`button`, `card`, `data-grid`, `confirm-dialog`, `dropdown-menu`, `toast`, `slide-panel`, etc.), but there's no single place to see what exists, what it looks like, or how to use it. This leads to rediscovering/duplicating similar components instead of reusing what's already built.

Add a **"Componentes" catalog page** documenting every available UI component with live examples, visible only in the local development environment — not shipped as a real feature for end users.

---

## ✅ Technical Tasks

- [x] 📂 **Route:** new page (`src/pages/dev/components.tsx`) rendering a live catalog of every component in `src/components/ui/` — each entry shows the component name, a short description, one or more rendered usage examples with representative props, and the import path
- [x] 🔧 **Dev-only guard:** add a `beforeLoad` to the route (`requireDev()` in `src/lib/route-guards.ts`, mirroring `requirePermission`/`requireRole`) that redirects away when `!import.meta.env.DEV`, so the route is inert even if it ends up in a production bundle — not just hidden from the menu
- [x] 📱 **Menu entry:** add a "Componentes" item to `menuItems` in `src/components/layout/Sidebar.tsx`, conditionally included only when `import.meta.env.DEV` is true — mirrors the existing dev-only pattern already used for `<DevDebugger />` in `src/components/layout/Layout.tsx:16`
- [x] 🔧 Keep entries presentational/read-only — static or mock props, no real API wiring needed
- [x] 📝 Structure the catalog so adding a new component's entry later is a small, obvious diff (one array entry per component in a registry file)

---

## 🎯 Acceptance Criteria

- [x] "Componentes" menu item appears in the sidebar only when running in dev (`npm run dev`) — absent from production builds
- [x] Navigating to the route directly by URL in a production build redirects away (defense in depth, not just menu-hidden)
- [x] Catalog covers all current components in `src/components/ui/`
- [x] Adding a newly-created component to the catalog later is straightforward and documented (in the catalog page itself)

---

## References

- Existing dev-only pattern: `src/components/layout/Layout.tsx:16`
- Sidebar menu item structure: `src/components/layout/Sidebar.tsx`
- Route guard patterns: `src/lib/route-guards.ts`

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `3h` · **Pessimistic:** `6h` · **Tracked:** `~2h 12m`

### 📅 Sessions
```json
[
  { "date": "2026-07-28", "start": "19:44", "end": "20:36" },
  { "date": "2026-07-29", "start": "11:00", "end": "12:20" }
]
```

---

## 📊 Retrospective
- **Actual total:** 2h 12m (52 min + 80 min)
- **vs optimistic:** −48m
- **vs pessimistic:** −3h 48m

**Justification:**

The first session (52m) finished well under the optimistic estimate. The route guard, sidebar entry, and page shell followed existing patterns closely (`requirePermission`/`requireRole`, the `devTools` conditional in `Layout.tsx`), so there was no design exploration needed — most of the time went into writing one demo per UI component in the registry. The only friction was in the first Cypress run: two assertions checked visibility on elements below the fold (a long catalog page, and a sidebar item near the bottom of a scrollable nav) without scrolling them into view first, and a third assertion depended on `ConfirmDialog`'s `container="viewport"` positioning, which is `absolute` relative to the document's initial containing block rather than the current scroll position — a pre-existing quirk exposed by testing a page taller than one viewport. Switching the scroll-dependent assertions to `.scrollIntoView()` and picking `ToggleSwitch` (no portal, no page-scroll dependency) for the interactive-example test resolved all three without touching the underlying component.

A second, untracked session (~80m, inferred from commit timestamps since no explicit start/close session was logged) covered two review-response cycles: addressing PR feedback (correcting an overstated dev-only comment, fully restoring env stubs with `vi.unstubAllEnvs()`, turning `CatalogEntry` into a discriminated union so `demo`/`note` are mutually exclusive, and fixing a wrong `importPath` on the Toast entry) and a follow-up SonarCloud quality-gate fix (marking `ComponentCatalogCard` props read-only). Still well under the pessimistic estimate overall — the review comments were all small, localized corrections rather than design rework.

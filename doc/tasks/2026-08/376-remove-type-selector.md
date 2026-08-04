# 🔨 Remove Insumo/Activo from item Type selector — Inventory scoped to resale products only

## Description

Remove the "Type" (`Insumo`/`Producto`/`Activo`) selector from the item creation/edit forms
(`code/webapp/src/components/inventory/item-form.tsx:124`,
`code/webapp/src/components/inventory/product-wizard.tsx:546`). This phase's Inventory module is
scoped to resale products only — items you buy and resell as-is (e.g. bottled drinks, packaged
snacks) — tracked via the existing stock/cost machinery.

## Reason

The Type field currently offers `Insumo` and `Activo` as choices, but neither is wired to any
distinct behavior anywhere in the app — selecting them doesn't change the wizard flow, and no
backend logic branches on them beyond the `Item` model's own type-check helpers. Leaving them in
the selector is a confusing dead end for anyone creating an item today. This phase's Inventory
scope is resale products only, so the selector should reflect that instead of offering choices
that do nothing.

## Objective

- The Type field is removed from both `item-form.tsx` and `product-wizard.tsx` (or, if a technical
  reason surfaces to keep the field structurally, it's hidden and hardcoded to `PRODUCTO`, never
  shown as a user choice)
- New items are created with `type: 'PRODUCTO'` without asking the user to choose
- Existing tests referencing the Type selector (`item-form.test.tsx`, `product-wizard.test.tsx`,
  `item-details.test.tsx`) are updated to match
- **No backend changes** — `items.type` enum stays `INSUMO`/`PRODUCTO`/`ACTIVO` as-is (no
  migration), and `CreateItemRequest`/`UpdateItemRequest` keep accepting all three values
  unchanged. This is a frontend-only restriction; the backend stays flexible for later.

## 🔗 References

- `code/webapp/src/components/inventory/item-form.tsx`
- `code/webapp/src/components/inventory/product-wizard.tsx`
- `code/api/app/Models/Item.php` (unchanged, referenced for context — `TYPE_INSUMO`/
  `TYPE_PRODUCTO`/`TYPE_ACTIVO` stay as they are)

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `0.5h` · **Pessimistic:** `1h` · **Tracked:** `12h42m`

### 📅 Sessions
```json
[
  { "date": "2026-08-03", "start": "21:44", "end": "10:26" }
]
```

## 📊 Retrospective

**Tracked:** `12h42m` total (1 session: 2026-08-03 21:44 → 2026-08-04 10:26).

**Variance:** far over both the optimistic (`0.5h`) and pessimistic (`1h`) estimates — roughly
12–25x. The estimate was sized for the actual code change (a small, localized UI removal across
two files), and the code change itself did land in well under an hour of active edits. The
overrun is not rework or scope creep: it's wall-clock elapsed across the single Sessions entry,
which spans the full `/issue` pipeline run end-to-end in one sitting — planning, TDD
implementation, PR creation, waiting on three separate CI runs (initial push, Copilot-fix push,
post-squash push) to go green, a Copilot review round-trip, and the Devin/DeepWiki scan — plus a
conversation-context gap in the middle of that sitting where the session was idle waiting on a
continuation prompt rather than actively working. The estimate template assumes focused
implementation time; it doesn't budget for CI queue time or idle gaps inside one continuous
session, which is most of what this figure reflects.

**Narrative:** Scope matched the issue exactly — no scope changes were requested mid-flight. One
Copilot review comment came back (a brittle test assertion asserting zero `<select>` elements
instead of checking for the removed "Type" label) and was addressed in a follow-up commit, which
triggered a second CI run and a required re-squash. The Devin/DeepWiki scan reported 0 bugs and 3
informational-only flags, all evaluated and found to be non-issues (by design, already covered by
a toast, or unaffected by the change) — no code changes resulted from that pass.




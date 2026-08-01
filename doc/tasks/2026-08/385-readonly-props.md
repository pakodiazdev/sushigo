# 🔨 Clear SonarCloud code-smell debt: mark webapp InfoItem/PropertyItem props as Readonly

## Description

SonarCloud shows 4 open `CODE_SMELL` issues on `pakodiazdev_sushigo-webapp` — all rule
`typescript:S6759` ("Mark the props of the component as read-only"), open since 2026-01-09
(~7 months, `sqale_index` = 20min of debt). No bugs, vulnerabilities, or pending security
hotspots on either project (`pakodiazdev_sushigo-api` is fully clean — 0 code smells).

Affected components — none type their props param as `Readonly<...>`:
- `code/webapp/src/components/inventory/item-details.tsx:236` — `PropertyItem`
- `code/webapp/src/components/inventory/item-details.tsx:263` — `InfoItem`
- `code/webapp/src/components/inventory/location-details.tsx:204` — `InfoItem`
- `code/webapp/src/components/inventory/variant-details.tsx:218` — `InfoItem`

## Reason

These are the only open issues across both SonarCloud projects — the rest of the codebase is at
zero debt. Fixing them clears the backlog to a clean 0/0/0 state and prevents `S6759` from being
copy-pasted into new components (three of the four are the same `InfoItem` pattern duplicated
across files).

## Objective

- All 4 flagged prop destructuring params are typed as `Readonly<Props>` (or component-local
  props type wrapped in `Readonly<>`), matching the pattern SonarCloud's `S6759` expects
- `npm run lint` and `npm run typecheck` pass with no new errors
- SonarCloud shows 0 open code smells on `pakodiazdev_sushigo-webapp` after the next analysis

## ✅ Technical Tasks

- [x] 🔧 Mark `PropertyItem` props as `Readonly<...>` in `item-details.tsx:236`
- [x] 🔧 Mark `InfoItem` props as `Readonly<...>` in `item-details.tsx:263`
- [x] 🔧 Mark `InfoItem` props as `Readonly<...>` in `location-details.tsx:204`
- [x] 🔧 Mark `InfoItem` props as `Readonly<...>` in `variant-details.tsx:218`

## 🔗 References

- SonarCloud rule: [typescript:S6759](https://rules.sonarsource.com/typescript/RSPEC-6759)
- Project: https://sonarcloud.io/project/issues?id=pakodiazdev_sushigo-webapp&resolved=false

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `0.5h` · **Pessimistic:** `1h` · **Tracked:** `13m`

### 📅 Sessions
```json
[
  { "date": "2026-08-01", "start": "11:38", "end": "11:51" }
]
```

## 📊 Retrospective
- **Actual total:** 0h 13m (13m)
- **vs optimistic:** −17m
- **vs pessimistic:** −47m

**Justification:**
Delivered under both estimates via `/issue`'s autonomous pipeline. The fix was purely mechanical —
wrapping four existing prop destructuring types in `Readonly<...>` with no behavior change — and
the issue's own Technical Tasks list already named the exact file/line for every occurrence, so no
exploration or design work was needed. Existing unit tests (24 across the three affected
components) covered regression risk with no new tests required. CI, Copilot, and the Devin/DeepWiki
review all passed clean on the first push — 0 bugs, 0 flags, no review comments — so there were no
fix/re-validate cycles to inflate the tracked time.





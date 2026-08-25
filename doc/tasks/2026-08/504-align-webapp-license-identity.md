# 🔨 Add license field and project identity to code/webapp package.json

**Labels:** sprint-5, investment: product-engineering

## Description

`code/webapp/package.json` has no `"license"` field at all — it only sets `"private": true`. Its `"name"` is the generic `"webapp"` and `"version"` is still the scaffold default `"0.0.0"`, never customized since the project was bootstrapped.

## Reason

Same root cause as the API-side issue (see #503): #145 defined the project's real license (Elastic License 2.0) at the repo root, but never propagated it into the webapp's own manifest. An absent `license` field is ambiguous to any tooling/auditor reading `package.json` directly — it doesn't state the actual ELv2 terms the repo intends to apply. External AI-assisted feedback (2026-08-24) flagged this alongside the API's MIT mismatch.

## Objective

`code/webapp/package.json` declares the project's real license and carries a project-specific identity instead of scaffold defaults.

## ✅ Technical Tasks

- [x] 🔧 Add a `"license"` field to `package.json` matching the value chosen in #503 for `composer.json`
- [x] 🔧 Update `"name"` from `"webapp"` to a project-specific name (e.g. `sushigo-webapp`)
- [ ] 🔧 Bump `"version"` off the placeholder `0.0.0` only if the project already has a real versioning convention to follow — don't invent one for this issue (not applicable — no versioning convention exists in `doc/conventions/`; left at `0.0.0` per this task's own conditional wording)

## 🎯 Acceptance Criteria

- [x] `package.json` has a `license` field matching the repo's actual license
- [x] `npm run build` and `npm run lint` still succeed after the change

## 🔗 References

- #145 — original license decision (Elastic License 2.0)
- #503 — same fix applied to `code/api`

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `0.25h` · **Pessimistic:** `0.5h` · **Tracked:** `0.13h` (~8m)

### 📅 Sessions
```json
[
  { "date": "2026-08-25", "start": "01:33", "end": "01:41" }
]
```

## 📊 Retrospective

- **Actual total:** 8m
- **vs optimistic:** −7m
- **vs pessimistic:** −22m

**Justification:**

Came in under the optimistic estimate — this mirrored #503's already-established pattern exactly
(same SPDX license id, same naming convention), so there was no design work, just applying the
precedent to `code/webapp/package.json`. The only real work beyond the two-line edit was confirming
`npm run build`/`lint`/`typecheck` still passed, which surfaced a pre-existing, unrelated stale
`node_modules` (missing `react-easy-crop`, already declared in `package-lock.json`) — fixed with a
plain `npm install`, not a defect introduced by this change. No automated review cycles ran against
this issue (delivered via `/issue-no-review` by request), so there was no review-response overhead
either.



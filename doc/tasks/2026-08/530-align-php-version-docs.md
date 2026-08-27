# 📚 Align documentation PHP version references with the 8.5 runtime

**Labels:** documentation, 🔨 technical-debt, sprint-6, investment: dev-platform

## Description

Several docs and coding-standard files still state the API runs on **PHP 8.2** (or **8.3**), which
was true at project start. The stack has since migrated to **PHP 8.5** — `docker/app/Dockerfile`
(`FROM php:8.5-apache`) and every CI workflow (`api-tests.yml`, `api-lint.yml`, `api-swagger.yml`
→ `php-version: '8.5'`) already run on 8.5. Only the human-facing documentation lags.

Update every live reference to say 8.5. Historical `doc/tasks/**` archives are point-in-time
snapshots and are intentionally left untouched.

## Reason

Surfaced in the Sprint 005 review: the stack is documented inconsistently (8.2 in the README/
CLAUDE.md, 8.3 in four backend convention headers), so a reader can't trust which PHP version the
conventions and examples target. Keeping the convention/standard docs accurate is work on the
system that develops the product, hence `investment: dev-platform`.

`code/api/composer.json` (`"php": "^8.2"`) is deliberately **out of scope** — `^8.2` already
resolves 8.5 and tightening the constraint is a separate decision.

## Objective

- Every live doc/standard reference to the API PHP version reads **8.5**.
- No remaining `PHP 8.2` / `PHP 8.3` string in tracked, non-archived documentation.
- `doc/tasks/**` archives untouched; `composer.json` untouched.
- `config/database.php`'s `PHP_VERSION_ID >= 80400` runtime guard untouched (correct as written).

## ✅ Technical Tasks

- [x] 📝 `README.md` — PHP badge (`PHP-8.2` → `PHP-8.5`) and the stack table row
- [x] 📝 `CLAUDE.md` — "Strong typing always (PHP 8.2)"
- [x] 📝 `RESUME_STATUS.md` — Backend stack row
- [x] 📝 `doc/conventions/backend/api-rules.md` — "strong typing in PHP 8.2" and the project scope line
- [x] 📝 `doc/conventions/backend/actions-services-repositories-standard.md` — scope header (8.3)
- [x] 📝 `doc/conventions/backend/controllers-standard.md` — scope header (8.3)
- [x] 📝 `doc/conventions/backend/media-uploads.md` — scope header (8.3)
- [x] 📝 `doc/conventions/backend/route-organization.md` — scope header (8.3)
- [x] 🔍 Re-grep for `8\.[0-4]` PHP references to confirm nothing live remains

## 🎯 Acceptance Criteria

- [x] `grep -rniE "php[ _-]?8\.[0-3]" --include="*.md"` returns only `doc/tasks/**` archive hits
- [x] The README badge renders "PHP 8.5"
- [x] `composer.json` and `config/database.php` are unchanged in the diff

## 🔗 References

- Sprint 005 review notes (documentation-consistency finding)
- `docker/app/Dockerfile`, `.github/workflows/api-*.yml` — the 8.5 source of truth
- Opportunistic follow-up under Sprint 006 §5.4

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `0h15m` · **Pessimistic:** `0h45m` · **Tracked:** `2h05m`

### 📅 Sessions
```json
[
  { "date": "2026-08-27", "start": "12:25", "end": "14:30" }
]
```

## 📊 Retrospective
- **Actual total:** 2h05m (125m)
- **vs optimistic:** +1h50m
- **vs pessimistic:** +1h20m

**Justification:**
Active working time was ~20m — well inside the 15m optimistic estimate for a mechanical,
doc-only find-and-replace across 9 files with no code, tests, or Swagger impact. The recorded
2h05m is almost entirely an involuntary pause: the session hit the claude.ai usage limit right
after the CI gate was watched green, and resumed ~1h45m later only to run the `/finish-pr`
close-out paperwork (issue finalization, local archive, project board, final squash + CI
re-check). The single work session's `start`/`end` pair spans that idle window because no
intermediate close was recorded; the estimate variance is a measurement artifact, not scope
growth or rework. Zero review threads, CI green on first push.





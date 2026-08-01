# 🔧 Remove hardcoded APP_KEY from docker-compose.prod.yml and docker-compose.preview.yml

## Description

`docker-compose.prod.yml` and `docker-compose.preview.yml` both embed the **same** hardcoded
`APP_KEY` (`base64:HiigE2awVygrgb5vyAQoXzdCqyMkEOBViWqhQ0guqnc=`), committed to this **public**
repository:

- `docker-compose.prod.yml:8` — passed as a Docker build `arg`, but it's dead: `docker/app/Dockerfile:88`
  has `# ARG APP_KEY` commented out, so the value is never actually consumed by the image build.
- `docker-compose.preview.yml:19` — passed as a runtime `environment` value and **is** consumed by
  the preview container (Laravel's encryption key).

By contrast, `sushigo-dev-lab`'s workspace bootstrap already does this correctly: each dev-lab
workspace clone gets its own unique key via `php artisan key:generate` (see
`scripts/lib/workspace-bootstrap.sh:152`) — confirmed workspaces a–e all have distinct keys. No
changes needed there.

## Reason

A single Laravel `APP_KEY` shared between prod and preview environments (and committed to git
history in a public repo) is a real secret-hygiene problem: it's the key used to encrypt
sessions, cookies, and any `encrypted` cast/column — if it leaks, all of that is decryptable, and
"leaks" here just means "read the repo." The prod build arg is also dead weight that should be
removed for clarity, not carried forward as future copy-paste bait.

## Objective

- `docker-compose.prod.yml` no longer declares a hardcoded `APP_KEY` build arg (drop it — it's
  unused since the Dockerfile doesn't declare `ARG APP_KEY`)
- `docker-compose.preview.yml` no longer hardcodes `APP_KEY` — sourced from an `${APP_KEY}` env
  var instead (read from a gitignored `.env` / CI secret, never committed)
- A documented process exists for generating/rotating that env-var-backed key per environment
  (e.g. `php artisan key:generate --show` run once, value stored outside git)
- Both current prod and preview environments have their `APP_KEY` rotated to a new value once the
  hardcoded one is removed, since the old value is permanently exposed in git history and must be
  treated as compromised
- `.env.example` files audited to confirm none hardcode a real key (`code/api/.env.example`
  already correctly ships `APP_KEY=` empty — verify webapp/root `.env.example` don't need one)

## ✅ Technical Tasks

- [x] 🔒 Remove the hardcoded `APP_KEY` build arg from `docker-compose.prod.yml` (dead — Dockerfile
      no longer declares `ARG APP_KEY`)
- [x] 🔒 Remove the hardcoded `APP_KEY` from `docker-compose.preview.yml`; replace with
      `APP_KEY=${APP_KEY}` sourced from env
- [x] 📝 Document how `APP_KEY` is supplied/rotated for prod and preview (README or
      `doc/conventions/`)
- [ ] 🔄 Rotate the actual prod/preview `APP_KEY` values (the committed one is compromised) — **not
      done by this PR**, requires GCP project access this automation doesn't have; see the PR's
      Assumptions section for the exact command a human must run
- [x] ✅ Verify `.env.example` files (`code/api/.env.example`, `code/webapp/.env.example`, root
      `.env.example`) contain no real key values

## 🔗 References

- `docker-compose.prod.yml:8`
- `docker-compose.preview.yml:19`
- `docker/app/Dockerfile:88` (dead `ARG APP_KEY`, commented out)
- `sushigo-dev-lab/scripts/lib/workspace-bootstrap.sh:152` (existing correct pattern — per-workspace
  `key:generate`, no changes needed)

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `1h` · **Pessimistic:** `2h` · **Tracked:** `33m`

### 📅 Sessions
```json
[
  { "date": "2026-08-01", "start": "11:41", "end": "12:14" }
]
```

## 📊 Retrospective
- **Actual total:** 0h 33m (33m)
- **vs optimistic:** −27m
- **vs pessimistic:** −1h 27m

**Justification:** Finished well under both estimates. This was a config + docs change (no PHP/JS
application code touched), so there was no PHPUnit/Vitest/Cypress test-writing overhead — the
research phase (tracing the real deploy path through `deploy-preview.yml`, `Dockerfile`, and the
architecture docs) resolved every open question up front, so implementation was a single clean
pass with no rework. One Copilot review round-trip (require `APP_KEY` to fail fast instead of
silently substituting empty) was addressed in a few minutes; Devin's DeepWiki scan found 0 bugs
and only informational/already-documented flags, needing no further changes. The one Technical
Task left unticked — rotating the live Cloud Run `APP_KEY` values — was correctly out of scope for
this session (requires GCP project access this automation doesn't have), which is also why the
estimate's upper bound wasn't needed: that step was never attempted here.





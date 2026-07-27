---
allowed-tools: Bash(ls:*), Bash(cat:*), Bash(grep:*), Bash(pwd:*), Bash(docker:*), Bash(docker compose:*), Bash(docker exec:*), Bash(php artisan:*)
description: Reset the current workspace's local database — drops, recreates, migrates, and re-seeds it
---

# Reset Local Database

Drop, recreate, migrate, and re-seed the database for **this** workspace. Works in both
dev-lab mode (multi-agent, `sushigo-dev-lab/workspaces/sushigo-<x>/`) and standalone Docker mode
— it detects which one you're in and uses the right reset path. Never touches another
workspace's database, and never touches production (this command has no production target at
all — it only knows how to reset a local dev database).

**This is destructive** for the target database only: every row in the local dev database is
wiped and replaced with fresh seed data. Invoking this command is the confirmation — it runs the
reset immediately, no further prompt.

---

## PHASE 1 — Detect the workspace and the mode

```bash
pwd
grep -m1 '^DB_DATABASE=' code/api/.env
ls ../../scripts/reset-workspace-db.sh 2>/dev/null && echo "DEV_LAB_MODE=true" || echo "DEV_LAB_MODE=false"
```

- Read `DB_DATABASE` from `code/api/.env` (not `.env.testing` — that's the test database, not the
  target of this command). In dev-lab it looks like `sushigo_ws_<letter>` (e.g. `sushigo_ws_d`) —
  extract `<letter>` for the dev-lab script call in Phase 2.
- If `../../scripts/reset-workspace-db.sh` exists relative to the current directory, you're in
  **dev-lab mode** (the current directory is `sushigo-dev-lab/workspaces/sushigo-<letter>/`).
  Otherwise you're in **standalone Docker mode**.
- If `DB_DATABASE` can't be read at all, stop and tell the user — do not guess a database name.

---

## PHASE 2 — Reset

### Dev-lab mode

Reuses the dev-lab's own reset script — it drops and recreates the actual Postgres database
(not just the tables), so leftover extensions/sequences don't survive a reset, then migrates and
seeds:

```bash
(cd ../.. && ./scripts/reset-workspace-db.sh sushigo-<letter>)
```

If it fails because the shared Postgres container isn't up, tell the user to run
`docker compose up -d` from the `sushigo-dev-lab` root first — do not start it yourself without
asking, since that affects every workspace, not just this one.

### Standalone Docker mode

```bash
docker exec -it dev_container bash -c "cd /app/code/api && php artisan migrate:fresh --seed"
```

If `dev_container` isn't running, tell the user to run `docker compose up --build` first — do not
start the full stack yourself without asking.

---

## PHASE 3 — Report

```
✅ Database reset for <workspace> (`<db-name>`)
   Migrated + seeded fresh.
```

If the reset failed, show the actual error output — do not retry silently more than once.

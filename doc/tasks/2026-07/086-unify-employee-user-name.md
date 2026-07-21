# Unify Employee name with User.name

Summary

We currently store `first_name`/`last_name` on `employees` and a full `name` on the linked `users` table. This duplication causes drift when updates are applied only to one side (e.g., Employee updated but User.name remains stale).

Problem

- Employee and User store the same conceptual data (person's name) in two places.
- Several endpoints update only the employee or only the user, producing inconsistencies.
- Long term this complicates auth responses, display names in the UI and certain integrations.

Proposal

- Migrate to a single source of truth: keep personal data (name, email, phone) on `users` and remove duplicate fields from `employees`.
- Update all codepaths to read employee display info from `user` relation.
- Provide a migration that drops `first_name` and `last_name` from `employees` after ensuring all references are switched.

Notes

- This is a breaking change for code expecting `employees.first_name`/`last_name` — requires coordinated work and a deprecation period.
- Not doing it now to avoid collisions with other active branches. Implement as a planned work item.

Acceptance criteria

- All UI and API responses use `user.name` (or `user.first_name`/`user.last_name` if split) where appropriate.
- Migration available to remove `first_name`/`last_name` columns from `employees` after verification.
- Backwards compatibility shims removed.

Estimated effort: 2-3 dev days (analysis + code changes + migrations + tests)

---

## Implementation decisions

- `users` gains `first_name`/`last_name` columns (backfilled by splitting the existing `name` value); `name` becomes a computed accessor (`"{first_name} {last_name}"`) on `User` for any caller that still wants a single display string (notifications, legacy responses) — not a physical column.
- No compatibility shim on `Employee` — every call site is switched to read from `$employee->user` directly (mirrors the existing `syncPositionRoles()`/`getPositionRoles()` delegation pattern already used for roles).
- `Auditable` trait added to `User` so name changes remain audited (moves from Employee's audit log to User's).
- Delivered as one full-stack PR (backend + frontend + tests), squashed to ≤3 commits per convention.

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `16h` · **Pessimistic:** `24h` · **Tracked:** `~4h10m`

### 📅 Sessions
```json
[
  { "date": "2026-07-20", "start": "17:31", "end": "21:41" }
]
```

---

## 📊 Retrospective

**Estimated:** 16h–24h · **Tracked:** ~4h10m · **Variance:** −11h50m under optimistic

One continuous session covering: the migration + backfill design, all backend call-site updates (2 actions, 6 controllers, 3 requests, 4 resources, 2 repository methods, 3 services, 6 seeder files, `config/seeders.php`), the full backend test suite going from 87 failures to green, verification that the frontend needed zero changes (full Vitest/ESLint/TypeScript run, not assumed), two rounds of PR review response (5 Copilot threads, then a Devin pass), a SonarCloud quality-gate fix cycle (duplication 3.6% → 0%, 2 code smells → 0), a real functional gap Devin caught and got fixed (User-level audit entries were unreachable through the public audit-logs endpoint), a frontend contract fix for the now-unused-but-still-tested `authService.register()`, and documenting an accepted, currently-theoretical FK orphan risk (`employees.user_id` `onDelete('set null')`) directly on the `Employee::user()` relation after confirming no code path exercises it today.

**What went well:** Verifying against the real database at every step (migration up/down/up cycles, fresh seed, full test suite reruns between fix batches) caught real issues before they reached review — the backfill's data-preference bug and the orphaned-`user_id` migration hazard were both raised by review and fixed, but most of the underlying join/ambiguous-column risks were caught by actually running the seeded DB rather than by inspection alone. Treating "frontend needs zero changes" and "no live code path deletes a User" as claims to verify (full test runs, a targeted codebase search) rather than assumptions avoided both an unnecessary frontend effort and an unnecessary FK migration.

**What to improve next time:** The original estimate was sized for a human executing this manually across days and doesn't transfer well to how this work actually gets done — a large share of the implied cost (context-switching, re-deriving call sites, manual verification) doesn't apply the same way here. For a well-scoped, mechanically-traceable migration like this one, ~4h tracked (implementation + two review-response rounds, including catching a real functional gap along the way) is a more realistic planning number than a multi-day estimate implies. Also worth noting: automated reviewers (Copilot, Devin) caught real, non-trivial issues across multiple passes — budgeting for at least one review-response round is not optional overhead, it's where a meaningful share of the correctness work happened.

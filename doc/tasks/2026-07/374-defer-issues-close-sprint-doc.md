# 🔧 Defer #276 and #85, close out Sprint 001 documentation

## Description

Mark issues #276 (WhatsApp real-provider integration) and #85 (Flutter mobile bootstrap) as deferred/low-priority and remove them from Sprint 001's active scope, then bring `doc/sprints/sprint-001-attendance-payroll-quality.md` up to date with the sprint's actual state — every other scoped issue is already merged.

## Reason

#276 only exists to replace `WhatsAppService`'s log-only send with a real provider so password-recovery OTPs reach users in production. The webapp already exposes the reset OTP via log, which is sufficient while there is no concrete plan to go to production, so the real integration isn't needed yet and that time is better spent on a more substantial improvement. #85 (Flutter mobile bootstrap) is postponed until the attendance functionality it would mirror is proven out in backend + web first, so the mobile app doesn't get built against a still-moving target.

Separately, Sprint 001 is technically closed — 25 of its 27 scoped issues are already merged — but its sprint document still shows several issues as pending/in-progress and has never been walked through its own closure checklist.

## Objective

- `deferred` and `priority: low` labels exist on the repo and are applied to #276 and #85
- Both issues carry a short comment explaining the deferral rationale above
- `doc/sprints/sprint-001-attendance-payroll-quality.md` reflects reality: every Round/Evidence row has its correct final status, PR, and merge commit; #276/#85 are recorded as removed from scope in §5.3 with their reason; Value Ranking moves #276 into the Deferred tier; totals, Quality Results, Results, Lessons Learned, and Follow-up Work are filled in; the Closure Checklist is walked and ticked; front matter status becomes `Completed`
- `doc/sprints/README.md` index reflects the sprint's completed status

## 🔗 References

- Sprint doc: `doc/sprints/sprint-001-attendance-payroll-quality.md`
- Convention: `doc/conventions/sprints.md`

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `1h` · **Pessimistic:** `2h` · **Tracked:** `4h 22m`

### 📅 Sessions
```json
[
  { "date": "2026-07-30", "start": "12:17", "end": "15:55" },
  { "date": "2026-07-30", "start": "17:35", "end": "18:19" }
]
```



## 📊 Retrospective
- **Actual total:** 4h 22m (218m + 44m)
- **vs optimistic:** +3h 22m
- **vs pessimistic:** +2h 22m

**Justification:** Went well over both estimates because self-review kept surfacing more stale/incorrect data than the original scope assumed. The first pass (labels on #276/#85, sprint document rewrite) was mechanical once `gh pr list --state merged` gave merge commits/timestamps for every scoped Issue in one call — but it already turned up 5 Issues (#305, #316, #319, #320, #321) merged without their status markers ever updated. Formalizing a wall-clock/parallelism metric in `doc/conventions/sprints.md` §7 to back the sprint's headline number required computing real figures from every Issue's raw session data, which exposed a data-integrity gap: #309's sprint-doc Tracked value (0.7h) traced back to no real Issue data at all. That deeper audit cascaded into further fixes — Consolidated Time Tracking Total row arithmetic, a stale #306 Tracked value, an ambiguous/self-contradictory Person-hours definition, unresolved §7 references, and #309/#340 gaps in Known Limitations and Execution Evidence. Separately, a first pass had marked the sprint `Completed`, which a closer read of `doc/conventions/sprints.md` §4 showed was premature (formal completion requires Sprint 002 to be promoted first) and had to be reverted. None of this was thrash on the original plan — it was the plan's own verification work (checking every Issue against real data before writing it into a permanent document) finding real errors, each of which needed its own fix.



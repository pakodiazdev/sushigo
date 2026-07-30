# 🔧 Task #355: Auto-run /rebase-main from /finish-pr when the branch is BEHIND main

## 📖 Story

As a developer running `/finish-pr`, I need it to automatically rebase my branch onto `main` when it's behind, so that I don't have to manually run `/rebase-main` and re-invoke `/finish-pr` every time main has moved.

## 🧠 Context

`/finish-pr` Phase 1b treated `mergeStateStatus: BEHIND` as a hard stop: it just told the user to run `/rebase-main` first and re-invoke the command. This added an unnecessary manual round-trip for the common case where the branch is behind but rebases cleanly.

---

## ✅ Technical Tasks

- [x] Update `.claude/commands/finish-pr.md` Phase 1b: when `mergeStateStatus` is `BEHIND`, automatically perform the same steps as `/rebase-main` (fetch origin/base, rebase, force-push if history changed) instead of stopping and telling the user to run it manually
- [x] If the automatic rebase hits conflicts, abort it and fall back to the current behavior — report the conflicting files and stop, telling the user to resolve manually
- [x] After a successful auto-rebase, re-fetch PR metadata to confirm `mergeStateStatus` is now `CLEAN` before continuing to the rest of Phase 1

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** —
- **Pessimistic:** —
- **Tracked:** not tracked via sessions

### 📅 Sessions
```json
[]
```

This issue was implemented directly, without going through `/start-issue`'s session-tracking flow — no local task file or `## ⏱️ Time` section existed before close, so Estimates/Sessions could not be honestly reconstructed. The only real signal available is commit timestamps: the initial implementation landed 2026-07-29 ~12:16, and the review-comment fixes plus sprint-doc update landed the same day ~18:36–18:37.

---

## 📊 Retrospective

- **Actual total:** not tracked (no session log existed for this issue)
- **vs optimistic:** n/a
- **vs pessimistic:** n/a

**Justification:**

No Estimates or Sessions were ever logged for this issue, so a real tracked-time comparison isn't possible. The implementation itself (Phase 1b and Phase 7.6c auto-rebase logic in `/finish-pr`) landed in a single commit. Copilot's automated review caught two real bugs on first pass: conflicted files being unrecoverable after `git rebase --abort` (both in Phase 1b and Phase 7.6c), and Phase 7.6c's post-rebase diff check silently overwriting its own comparison reference before checking it. Both were fixed in a follow-up commit, and the PR itself needed to absorb 3 commits worth of `main` drift via the exact auto-rebase mechanism it introduces before it could be merged.

---

## 🔗 References

- GitHub issue: [#355](https://github.com/pakodiazdev/sushigo/issues/355)
- PR: [#356](https://github.com/pakodiazdev/sushigo/pull/356)

# 🔨 Make /issue run fully unattended — zero-interruption mode

## Description

`/issue` (`.claude/commands/issue.md`, added in #388) already runs most of an issue's delivery
without interaction, but documents 5 explicit points where it stops and calls `AskUserQuestion`:

1. Phase 1 — a planning ambiguity survives research
2. Phase 6 — Copilot disputes a business rule
3. Phase 8 — Devin disputes a business rule
4. Phase 8/9 — the Chrome extension isn't connected for the Devin/DeepWiki review
5. Phase 10 — always asks the user to paste `/usage`'s output for cost logging

## Reason

The end goal is to run `/issue` as the target of a scheduled loop that picks up newly-assigned
issues and delivers them with nobody watching. Any point that blocks on `AskUserQuestion` breaks
that model — a run parked on a prompt with no one there to answer never completes.

## Objective

`/issue` never calls `AskUserQuestion` or otherwise pauses for a human reply, at any phase:

- **Ambiguity (Phase 1)**: resolve with the most literal reading of the issue text; if the issue is
  genuinely silent (not just under-specified), fall back to the most conservative/restrictive
  reading. Record the resolution under `### Assumptions`.
- **Business-rule disputes (Phase 6/8)**: keep the issue's literal reading, reply on the
  Copilot/Devin thread explaining why, and log the dispute — verbatim comment/flag + reasoning — in
  a new `## ⚠️ Needs Human Judgment` section on the PR, so a human still reviews it, just at merge
  time instead of mid-run.
- **Chrome extension unavailable (Phase 8/9)**: auto-skip the Devin/DeepWiki phase instead of
  asking whether to wait; note the skip plainly in the final report.
- **Cost logging (Phase 10)**: skip it entirely — no `## 💸 Token & Cost` entry, no prompt. Anyone
  who wants a run's cost can run `/usage` themselves afterward.

Nothing about the safety caps (Phase 5's 6-failure CI cap, Phase 8's 5-cycle Devin cap) changes —
those still end a run and report, which is a protective limit, not a judgment call.

## Non-goals (this issue)

- The loop/scheduler itself that watches for newly-assigned issues and dispatches `/issue`.
- Automatic double-dispatch detection (checking for an existing branch/PR before starting) — the
  command documents this as a real gap for a future loop to close, but doesn't implement it here.

## References

- Parent design: #388 (`/issue` original implementation)
- `.claude/commands/issue.md` — the file being changed
- `.claude/commands/finish-pr.md` — Phase 9 delegates to its Phase 7.6b; that file's own
  interactive Chrome-extension fallback is unchanged for its *standalone* callers, only overridden
  when reached from inside `/issue`

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `1h` · **Pessimistic:** `2h` · **Tracked:** `1h29m`

### 📅 Sessions
```json
[
  { "date": "2026-08-05", "start": "19:15", "end": "20:44" }
]
```

## 📊 Retrospective
- **Actual total:** 1h 29m (89m)
- **vs optimistic:** +29m
- **vs pessimistic:** −31m

**Justification:** Landed under the pessimistic estimate despite two extra review cycles. The
initial pass replaced all five `AskUserQuestion` stops in one commit; `/pr-comments` then surfaced
a real Copilot-flagged inconsistency (Phase 1 recorded assumptions under `### Assumptions` while
Phase 4 defined the actual PR section as `## 🤔 Assumptions`) that needed a follow-up fix. A
subsequent manual code-review-style pass over the same diff — holding a documentation/process
change to the same rigor as application code — caught three more self-inflicted defects: stale
`Phase 10a/10b` cross-references left over from the cost-logging removal, an incomplete
enumeration of `finish-pr.md`'s Phase 0–2 stop conditions in the Session-closing rule, and an
ambiguous "carried into the same PR section" phrase whose nearest antecedent pointed at the wrong
PR section. None of this was scope creep — it's the normal cost of getting a self-referential
instruction file (one that governs its own future autonomous runs) internally consistent.



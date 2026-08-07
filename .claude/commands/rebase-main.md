---
allowed-tools: Bash(git fetch:*), Bash(git rebase:*), Bash(git push:*), Bash(git status:*), Bash(git branch:*), Bash(git log:*), Bash(git add:*), Bash(git diff:*), Read, Edit
description: Update main from remote, rebase the current branch onto it, and force-push if needed
---

# Rebase onto updated main

Update `origin/main` and rebase the current branch onto it. End with `--force-with-lease` push if the branch history was rewritten.

## Steps

### 1. Check current state

```bash
git status --short
git branch --show-current
git log --oneline -5
```

- If there are **uncommitted changes**, stop and tell the user to stash or commit first.
- If the current branch **is** `main`, stop and tell the user there is nothing to rebase.

### 2. Fetch origin/main

```bash
git fetch origin main
```

Show how many new commits arrived on main since the branch diverged.

### 3. Rebase

```bash
git rebase origin/main
```

- If rebase **succeeds**, continue to step 4.
- If rebase **hits conflicts**, try to resolve them yourself before giving up:
  - Read each conflicted file's markers and the surrounding context on both sides (`git log -1 origin/main` and the commit being replayed) to understand what each side was trying to do.
  - Resolve when the correct outcome is unambiguous — most conflicts in generated/tracked docs (sprint trackers, changelogs, progress tables) are two additive edits to the same line that both need to survive (e.g. two different PRs each appending their own entry to a shared list/count) — merge them into one coherent line reflecting both, recomputing any counts/percentages affected, rather than picking one side.
  - Stage each resolved file (`git add <file>`) and continue with `GIT_EDITOR=true git rebase --continue` once every conflict in the step is resolved (do not pass `--no-edit`, which is not a valid flag here).
  - If a conflict is **not** safely resolvable — the two sides made substantively different decisions about the same logic/code (not just two additive facts), you'd be guessing at intent, or resolving it means discarding either side's actual change — stop, run `git rebase --abort` to restore the pre-rebase state, report exactly which files and hunks conflicted and why you didn't resolve them, and ask the user for guidance before proceeding.

### 4. Push

After a successful rebase, check whether the remote branch exists and whether history was rewritten:

```bash
git log --oneline origin/$(git branch --show-current)..HEAD 2>/dev/null || true
```

- If the remote branch does not exist yet, push normally: `git push origin HEAD`.
- If history was rewritten (commits were rebased), push with `--force-with-lease`: `git push --force-with-lease origin HEAD`.
- If nothing changed (branch was already up to date and no rewrite occurred), skip the push and say so.

### 5. Report

Print a short summary:
- How many new commits were pulled into main.
- How many commits from the current branch were rebased.
- Whether the push used `--force-with-lease` or was a normal push.

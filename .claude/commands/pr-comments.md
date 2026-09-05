---
allowed-tools: Bash(gh api:*), Bash(gh pr view:*), Bash(gh repo view:*), Bash(git fetch:*), Bash(git checkout:*), Bash(git push:*), Bash(git log:*), Bash(git diff:*), Bash(git add:*), Bash(git commit:*), Bash(git branch:*), Bash(git status:*), Read, Edit, Write
description: Address open review thread comments on a GitHub PR — analyze each, fix or justify, reply with outcome, and resolve the thread
---

Address all open review thread comments on a GitHub PR.

**Usage:** `/pr-comments <PR_NUMBER>` or `/pr-comments <owner/repo> <PR_NUMBER>`

## Steps

### 1. Load context

- Parse `$ARGUMENTS` to extract the PR number and optionally `owner/repo`. If no repo is provided, detect it with:
  ```bash
  gh repo view --json nameWithOwner --jq .nameWithOwner
  ```
- Fetch PR metadata:
  ```bash
  gh pr view <number> --repo <owner/repo> --json title,state,headRefName,baseRefName,isDraft
  ```
- If the PR is closed or merged, stop and inform the user. A **draft** PR is fine to process
  (#598): merge-blocking is draft status now, and the `/issue*` pipelines open PRs as drafts, so
  addressing review comments on a still-draft PR is the normal case — do not stop on `isDraft`.
- Read the root `CLAUDE.md` (if present) to understand the project's commit convention, linting commands, and code style rules. This is critical — do not skip it.

### 2. Fetch open review threads

Use the GitHub GraphQL API to list all unresolved review threads:

```bash
gh api graphql -f query='
  query($owner: String!, $repo: String!, $pr: Int!) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $pr) {
        reviewThreads(first: 50) {
          nodes {
            id
            isResolved
            path
            line
            comments(first: 10) {
              nodes {
                id
                databaseId
                body
                author { login }
              }
            }
          }
        }
      }
    }
  }
' -f owner=<owner> -f repo=<repo> -F pr=<number>
```

Filter to threads where `isResolved = false`. If there are none, report "No open review threads found." and stop.

### 3. Ensure the PR branch is checked out

```bash
git fetch origin <headRefName>
git checkout <headRefName>
```

### 4. Process each open thread

For each unresolved thread, in order:

#### a. Analyze the comment

Read the comment body. Then read the file at `path` around the referenced `line` for context. Decide:

- **Address** — the comment identifies a real issue, a valid improvement, or a violation of the project's conventions. The fix is clear, safe, and localized.
- **Skip** — the comment is a false positive, does not apply to this codebase's conventions, is already handled elsewhere, or the suggested change would introduce more risk than benefit. A clear justification is required.

#### b. If addressing

1. Implement the fix in the relevant file(s).
2. Run the project linter/formatter if configured (read CLAUDE.md for the exact command — e.g. `pint`, `eslint`, `shellcheck`). Stage any auto-fixed files.
3. Stage changed files and commit following the project's commit convention from CLAUDE.md. Reuse the issue number from the current branch name or recent commits.
4. Capture the commit SHA:
   ```bash
   git log -1 --format=%H
   ```

Do **not** reply or resolve yet — continue to the next thread. Replies and resolutions happen after the push so that commit references are live on GitHub.

### 5. Push all commits

After every thread has been analyzed and fixes committed, push once:

```bash
git push origin <headRefName>
```

This step is **mandatory** even if all threads were skipped (no commits to push is fine — the push is a no-op). It must run before any replies are posted so commit SHAs are reachable on GitHub.

### 6. Reply and resolve every thread

Loop over each thread processed in step 4 and, in order:

#### a. Reply to the thread

Post a reply to the thread's first comment via the REST API:

```bash
gh api repos/<owner>/<repo>/pulls/<pr_number>/comments/<comment_databaseId>/replies \
  --method POST \
  --field body="<reply>"
```

Reply format:
- **If addressed:** Describe what was changed and why (2–3 sentences), then close with the commit reference: `Fixed in <short_sha> — <one-line summary of the change>.`
- **If skipped:** Explain concisely why this comment was not addressed. Reference the specific convention or reasoning (e.g. "This is correct per the CLAUDE.md convention — `copy()` is required to avoid mutating the shared Carbon instance.").

Keep replies under 4 sentences. Match the language used in the thread (Spanish if the thread is in Spanish, English otherwise).

#### b. Resolve the thread

```bash
gh api graphql -f query='
  mutation($threadId: ID!) {
    resolveReviewThread(input: { threadId: $threadId }) {
      thread { id isResolved }
    }
  }
' -f threadId=<thread_node_id>
```

Resolve **every** processed thread — both addressed and skipped. A skipped thread is still closed because a reply explains the decision.

### 7. Report

Summarize to the user:
- Total open threads found
- Threads addressed: file path, one-line description, commit SHA
- Threads skipped: file path, one-line justification

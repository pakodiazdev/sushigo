# sprint-audit

Deterministic **sprint-closure reconciliation audit** (issue #587). Reconciles a sprint's evidence
across the four systems that hold it — Issue bodies/`Sessions`, the GitHub Project
Iteration/Status, `sprint-<N>` labels, and the sprint document — and blocks closure on ambiguous
drift.

Canonical semantics: [`doc/conventions/sprint-closure-audit.md`](../../../doc/conventions/sprint-closure-audit.md).

## Usage

```bash
# Audit the current sprint (highest-numbered doc/sprints/sprint-NNN-*.md)
GH_TOKEN=$(gh auth token) node .github/scripts/sprint-audit/generate.js

# A specific sprint document, report-only, raw JSON
node .github/scripts/sprint-audit/generate.js \
  --sprint-doc doc/sprints/sprint-007-warehouse-receiving-and-location-aware-stock.md \
  --allow-fail --json
```

Exit code `1` when a `FAIL`-class drift is found (unless `--allow-fail`); `0` for a clean run or a
warn-only run. Needs a token in `GH_TOKEN` / `PROJECTS_TOKEN` with read access to the org Project.

`--help` lists every flag.

## Module layout

| File | Responsibility | Pure? |
|---|---|---|
| `parse-sprint-doc.js` | Frontmatter + §5.1/§7 formal scope + §5.4 opportunistic + §13 evidence, from the sprint markdown. | ✅ |
| `parse-issue-evidence.js` | One Issue body → tracked minutes + metric confidence from `Sessions`; unchecked tasks + their deferral disposition. | ✅ |
| `audit.js` | `auditSprint()` — the reconciliation: FAIL/WARN lists, the three separate effort figures, metric confidence. | ✅ |
| `render-report.js` | `auditSprint()` result → the plain-text closure-audit report. | ✅ |
| `fetch-data.js` | GitHub GraphQL/REST: Project board items + Iteration resolution + REST backfill for off-board scoped Issues. | network |
| `generate.js` | CLI entry — arg parsing, current-sprint resolution, wiring, exit code. | mixed |

## Tests

```bash
node --test .github/scripts/sprint-audit/tests/*.test.js
```

Runs in CI as part of the `scripts-tests` job (`.github/workflows/ci.yml`) on any change under
`.github/scripts/**`. Covers all nine *Tests / Validation* cases from issue #587 plus parser and
CLI-argument tests. `fetch-data.js` is exercised only by the CLI, not in CI (no network in tests).

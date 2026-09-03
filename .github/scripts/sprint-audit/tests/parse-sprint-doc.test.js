'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { parseSprintDoc } = require('../parse-sprint-doc.js');
const { readFixture } = require('./helpers.js');

test('parseSprintDoc reads frontmatter, scope, opportunistic and evidence from a 5.1-style doc', () => {
  const result = parseSprintDoc(readFixture('sprint-042-example.md'));

  assert.equal(result.sprint, '042');
  assert.equal(result.sprintNumber, 42);
  assert.equal(result.status, 'In Progress');
  assert.equal(result.started, '2026-09-01');
  assert.equal(result.completed, null);
  assert.equal(result.scopeIssuesDeclared, 4);
  assert.deepEqual(result.formalScopeIssues, [900, 901, 902, 903]);
  assert.deepEqual(result.opportunisticIssues, [950]);
  assert.deepEqual(
    result.executionEvidence.map((e) => e.issue),
    [900, 901, 902, 903, 950],
  );
  assert.equal(result.executionEvidence[0].status, '✅');
});

test('parseSprintDoc keeps opportunistic issues out of formal scope even if cross-referenced', () => {
  const md = `---
sprint: "9"
status: In Progress
scope_issues: 1
---
## 5. Scope

### 5.1 Included Issues

| Status | Issue | Title |
|---|---:|---|
| ✅ | #100 | Real scope, also mentions #200 |

### 5.4 Opportunistic Work

| Date | Issue | Title | Trigger | Result |
|---|---:|---|---|---|
| 2026-09-02 | #200 | Opportunistic | x | y |
`;
  const result = parseSprintDoc(md);
  assert.deepEqual(result.formalScopeIssues, [100]);
  assert.deepEqual(result.opportunisticIssues, [200]);
});

test('a scope row whose title contains the word "total" is still parsed', () => {
  const md = `---
sprint: "9"
status: In Progress
scope_issues: 2
---
## 5. Scope

### 5.1 Included Issues

| Status | Issue | Title |
|---|---:|---|
| ✅ | #123 | Compute the order total on checkout |
| ✅ | #124 | Show a running total in the cart |
|  |  | **Total** |
`;
  const result = parseSprintDoc(md);
  assert.deepEqual(result.formalScopeIssues, [123, 124]);
});

test('a blank or non-numeric scope_issues yields null (audit turns that into a mismatch)', () => {
  const base = `## 5. Scope\n\n### 5.1 Included Issues\n\n| Status | Issue | Title |\n|---|---:|---|\n| ✅ | #1 | X |\n`;
  assert.equal(parseSprintDoc(`---\nsprint: "9"\n---\n${base}`).scopeIssuesDeclared, null);
  assert.equal(parseSprintDoc(`---\nsprint: "9"\nscope_issues:\n---\n${base}`).scopeIssuesDeclared, null);
  assert.equal(parseSprintDoc(`---\nsprint: "9"\nscope_issues: 13 issues\n---\n${base}`).scopeIssuesDeclared, null);
  assert.equal(parseSprintDoc(`---\nsprint: "9"\nscope_issues: 3\n---\n${base}`).scopeIssuesDeclared, 3);
});

test('parseSprintDoc resolves cross-repo issue references (inline and repo-column)', () => {
  const md = `---
sprint: "3"
status: Completed
scope_issues: 3
---
## 5. Scope

### 5.1 Included Issues

| Status | Issue | Repo | Title |
|---|---:|---|---|
| ✅ | dev-lab#64 |  | Bats coverage for bootstrap helpers |
| ✅ | #67 | \`sushigo-dev-lab\` | make status overview |
| ✅ | #400 | \`sushigo\` | Employee identity |
`;
  const result = parseSprintDoc(md);
  assert.deepEqual(
    result.scopeRefs,
    [
      { repo: 'pakodiazdev/sushigo-dev-lab', number: 64 },
      { repo: 'pakodiazdev/sushigo-dev-lab', number: 67 },
      { repo: null, number: 400 },
    ],
  );
  assert.deepEqual(result.formalScopeIssues, [64, 67, 400]);
});

test('an unrecognized repo token is preserved, not collapsed onto the default repo', () => {
  const md = `---
sprint: "3"
scope_issues: 1
---
## 5. Scope

### 5.1 Included Issues

| Status | Issue | Title |
|---|---:|---|
| ✅ | unknown-repo#64 | Typo'd repo alias |
`;
  const result = parseSprintDoc(md);
  assert.deepEqual(result.scopeRefs, [{ repo: 'unknown-repo', number: 64 }]);
});

test('a Route-table round-number cell is not mistaken for the Issue cell', () => {
  const md = `---
sprint: "7"
scope_issues: 2
---
## 7. Route A — Execution Rounds

### Round 1

| # | Issue | Title | Value | Opt. | Pess. | Tracked | PR / Commit | Notes |
|---:|---:|---|---|---:|---:|---:|---|---|
| 1 | #560 | First | High | 1h | 2h | 1.5h | PR #900 | — |
| 2 | #561 | Second | High | 1h | 2h | 2h | PR #901 | — |
`;
  const result = parseSprintDoc(md);
  assert.deepEqual(result.formalScopeIssues, [560, 561]);
});

test('a malformed "sprint" frontmatter value yields sprintNumber null + invalid flag', () => {
  const md = `---
sprint: "007foo"
scope_issues: 0
---
## 5. Scope
`;
  const result = parseSprintDoc(md);
  assert.equal(result.sprintNumber, null);
  assert.equal(result.sprintNumberInvalid, true);
});

test('§5.3 Scope Changes are applied — removals drop and additions add', () => {
  const md = `---
sprint: "1"
scope_issues: 2
---
## 5. Scope

### 5.1 Included Issues

| Status | Issue | Title |
|---|---:|---|
| ⏳ | #85 | Flutter bootstrap |
| ✅ | #300 | Real delivered work |

### 5.3 Scope Changes

| Date | Status | Item | Change | Reason |
|---|---|---|---|---|
| 2026-08-01 | ❌ | #85 | Removed from sprint | Descoped |
| 2026-08-13 | ✅ | dev-lab#72 | Added — require the Bats CI gate | Opportunistic |
| 2026-08-05 | ⚠️ | Previous approach | Superseded | Replacement chosen |
`;
  const result = parseSprintDoc(md);
  assert.deepEqual(result.scopeRefs, [
    { repo: 'pakodiazdev/sushigo-dev-lab', number: 72 },
    { repo: null, number: 300 },
  ]);
  assert.ok(!result.formalScopeIssues.includes(85));
});

test('initialScopeCount is the §5.1 count BEFORE §5.3 changes', () => {
  const md = `---
sprint: "1"
scope_issues: 2
---
## 5. Scope

### 5.1 Included Issues

| Status | Issue | Title |
|---|---:|---|
| ✅ | #10 | A |
| ✅ | #11 | B |

### 5.3 Scope Changes

| Date | Status | Item | Change | Reason |
|---|---|---|---|---|
| 2026-08-01 | ✅ | #99 | Added — extra work | x |
`;
  const result = parseSprintDoc(md);
  assert.equal(result.initialScopeCount, 2); // matches scope_issues: 2
  assert.equal(result.scopeRefs.length, 3); // post-§5.3, what gets audited
});

test('§5.1 as a bullet list is parsed, and initialScopeCount comes from §5.1 not Route A', () => {
  const md = `---
sprint: "5"
scope_issues: 3
---
## 5. Scope

### 5.1 Included

- Suppliers and offerings (\`#431\`).
- Receipt posting and unit cost (\`#432\`).
- Cost preview UI (\`#433\`).

### 5.3 Scope Changes

| Date | Status | Item | Change | Reason |
|---|---|---|---|---|
| 2026-08-23 | Added | #399 | Opportunistic follow-on | x |

## 7. Route A — Execution Rounds

### Round 1

| Status | Issue | Title | Value | Opt. | Pess. | Tracked | PR | Notes |
|---|---:|---|---|---:|---:|---:|---|---|
| ✅ | #431 | a | H | 1h | 2h | 1h | PR #1 | — |
| ✅ | #432 | b | H | 1h | 2h | 1h | PR #2 | — |
| ✅ | #433 | c | H | 1h | 2h | 1h | PR #3 | — |
| ✅ | #399 | d (already copied in) | H | 1h | 2h | 1h | PR #4 | — |
`;
  const result = parseSprintDoc(md);
  assert.equal(result.initialScopeCount, 3); // §5.1 bullets, not the 4 in Route A
  assert.deepEqual(
    result.scopeRefs.map((r) => r.number).sort((a, b) => a - b),
    [399, 431, 432, 433], // §5.1 + the §5.3 addition are audited
  );
});

test('a code-formatted issue cell (`dev-lab#72`) is recognized', () => {
  const md = `---
sprint: "3"
scope_issues: 1
---
## 5. Scope

### 5.3 Scope Changes

| Date | Status | Item | Change | Reason |
|---|---|---|---|---|
| 2026-08-13 | ✅ | \`dev-lab#72\` | Added — require the Bats CI gate | Opportunistic |
`;
  const result = parseSprintDoc(md);
  assert.deepEqual(result.scopeRefs, [{ repo: 'pakodiazdev/sushigo-dev-lab', number: 72 }]);
});

test('parseSprintDoc falls back to Route A round tables when there is no 5.1 subsection', () => {
  const md = `---
sprint: "3"
status: Completed
---
## 7. Route A — Execution Rounds

### Round 1 — Foundations

| Status | Issue | Title | Value | Opt. | Pess. | Tracked | PR / Commit | Notes |
|---|---:|---|---|---:|---:|---:|---|---|
| ✅ | #311 | First | High | 1h | 2h | 1.5h | PR #400 | — |
| ✅ | #312 | Second | High | 1h | 2h | 2h | PR #401 | — |
|  |  | **Round total** |  | **2h** | **4h** | **3.5h** |  |  |
`;
  const result = parseSprintDoc(md);
  assert.deepEqual(result.formalScopeIssues, [311, 312]);
});

test('parseSprintDoc tolerates a missing frontmatter block', () => {
  const result = parseSprintDoc('# Sprint doc with no frontmatter\n\n## 5. Scope\n');
  assert.equal(result.sprint, null);
  assert.deepEqual(result.formalScopeIssues, []);
});

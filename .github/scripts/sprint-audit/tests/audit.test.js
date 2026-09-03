'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { parseSprintDoc } = require('../parse-sprint-doc.js');
const { auditSprint } = require('../audit.js');
const { readFixture, issueBody, scopedIssue } = require('./helpers.js');

const SPRINT_DOC = parseSprintDoc(readFixture('sprint-042-example.md'));
const ITERATION = { id: 'iter-42', title: 'Sprint 42' };
const TODAY = '2026-09-05';

function baseIssues() {
  // Every source aligned for all four scoped issues + the opportunistic one.
  return [
    scopedIssue(900),
    scopedIssue(901),
    scopedIssue(902),
    scopedIssue(903),
    {
      number: 950,
      state: 'CLOSED',
      projectStatus: 'Done',
      projectIterationId: 'iter-42',
      labels: ['sprint-42', 'investment: dev-platform'],
      body: issueBody({ sessions: [{ date: '2026-09-02', start: '10:00', end: '11:00' }] }),
    },
  ];
}

function run(issues, extra = {}) {
  return auditSprint({ sprintDoc: SPRINT_DOC, issues, activeIteration: ITERATION, today: TODAY, ...extra });
}

// 1 — Fixture where every source agrees -> audit passes.
test('every source agrees -> PASS, no failures, no warnings', () => {
  const result = run(baseIssues());
  assert.equal(result.ok, true);
  assert.deepEqual(result.failures, []);
  assert.deepEqual(result.warnings, []);
  assert.equal(result.formalScope.total, 4);
  assert.equal(result.formalScope.closed, 4);
  assert.equal(result.metricConfidence, 'high');
});

// 2 — Issue in scope but missing sprint label -> actionable failure.
test('scoped issue missing its sprint label -> FAIL (sprint-label-missing)', () => {
  const issues = baseIssues();
  issues[1] = scopedIssue(901, { labels: ['investment: product'] });
  const result = run(issues);
  assert.equal(result.ok, false);
  assert.ok(result.failures.some((f) => f.code === 'sprint-label-missing' && f.issue === 901));
  assert.deepEqual(result.missingSprintLabel, [901]);
});

test('a zero-padded sprint label (sprint-042) is NOT accepted for Sprint 42 -> FAIL', () => {
  const issues = baseIssues();
  issues[1] = scopedIssue(901, { labels: ['sprint-042', 'investment: product'] });
  const result = run(issues);
  assert.equal(result.ok, false);
  const f = result.failures.find((x) => x.code === 'sprint-label-missing' && x.issue === 901);
  assert.ok(f);
  assert.match(f.message, /zero-padded/);
});

// 3 — Issue labeled sprint but not in formal scope -> warning / orphan, never a failure.
test('sprint-labeled issue outside formal scope -> WARN (orphan), not a failure', () => {
  const issues = baseIssues();
  issues.push({
    number: 999,
    state: 'CLOSED',
    projectStatus: 'Done',
    projectIterationId: 'iter-42',
    labels: ['sprint-42', 'investment: product'],
    body: issueBody({ sessions: [{ date: '2026-09-02', start: '09:00', end: '09:30' }] }),
  });
  const result = run(issues);
  assert.equal(result.ok, true);
  assert.ok(result.warnings.some((w) => w.code === 'orphan' && w.issue === 999));
  assert.ok(result.failures.every((f) => f.issue !== 999));
  assert.deepEqual(result.orphans, [999]);
});

// 4 — Closed Issue with unchecked task and no deferral -> failure.
test('closed scoped issue with an undisposed unchecked task -> FAIL', () => {
  const issues = baseIssues();
  issues[2] = scopedIssue(902, {
    body: issueBody({
      sessions: [{ date: '2026-09-02', start: '10:00', end: '12:00' }],
      tasks: [
        { text: 'Shipped part', done: true },
        { text: 'Never finished this part', done: false },
      ],
    }),
  });
  const result = run(issues);
  assert.equal(result.ok, false);
  assert.ok(
    result.failures.some((f) => f.code === 'closed-with-undisposed-tasks' && f.issue === 902),
  );
  assert.equal(result.uncheckedTasks.byIssue[902].undisposed, 1);
});

// 5 — Closed Issue with unchecked task explicitly linked to follow-up -> pass.
test('closed scoped issue whose unchecked task is deferred to a follow-up -> PASS', () => {
  const issues = baseIssues();
  issues[2] = scopedIssue(902, {
    body: issueBody({
      sessions: [{ date: '2026-09-02', start: '10:00', end: '12:00' }],
      tasks: [
        { text: 'Shipped part', done: true },
        { text: 'Edge case — deferred to #1234 as a follow-up', done: false },
      ],
    }),
  });
  const result = run(issues);
  assert.equal(result.ok, true);
  assert.ok(!result.failures.some((f) => f.code === 'closed-with-undisposed-tasks'));
  assert.equal(result.uncheckedTasks.total, 1);
  assert.equal(result.uncheckedTasks.undisposed, 0);
});

// 6 — Missing Investment Type -> failure.
test('scoped issue with no canonical investment label -> FAIL (investment-missing)', () => {
  const issues = baseIssues();
  issues[3] = scopedIssue(903, { labels: ['sprint-42'] });
  const result = run(issues);
  assert.equal(result.ok, false);
  assert.ok(result.failures.some((f) => f.code === 'investment-missing' && f.issue === 903));
  assert.deepEqual(result.missingInvestment, [903]);
});

test('scoped issue with a non-canonical investment label -> FAIL (investment-missing)', () => {
  const issues = baseIssues();
  issues[3] = scopedIssue(903, { labels: ['sprint-42', 'investment: infrastructure'] });
  const result = run(issues);
  assert.ok(result.failures.some((f) => f.code === 'investment-missing' && f.issue === 903));
});

test('investment mix is tallied from canonical labels across formal scope', () => {
  const issues = baseIssues();
  issues[0] = scopedIssue(900, { labels: ['sprint-42', 'investment: dev-platform'] });
  issues[1] = scopedIssue(901, { labels: ['sprint-42', 'investment: product-engineering'] });
  // 902 and 903 keep the default 'investment: product'.
  const result = run(issues);
  assert.deepEqual(result.investmentMix, {
    'investment: product': 2,
    'investment: product-engineering': 1,
    'investment: dev-platform': 1,
    unknown: 0,
  });
});

// 7 — Opportunistic Issue listed in sprint doc -> counted separately.
test('opportunistic tracked time is aggregated separately from formal tracked time', () => {
  const result = run(baseIssues());
  // Four scoped issues * 60 min each.
  assert.equal(result.formalTrackedMinutes, 240);
  // The opportunistic issue #950 contributes 60 min, and only there.
  assert.equal(result.opportunisticTrackedMinutes, 60);
  assert.equal(result.otherSameWindowTrackedMinutes, 0);
});

test('opportunistic issue missing its sprint label -> WARN (not a failure)', () => {
  const issues = baseIssues();
  issues[4] = {
    number: 950,
    state: 'CLOSED',
    projectStatus: 'Done',
    projectIterationId: 'iter-42',
    labels: ['investment: dev-platform'], // no sprint-42 label
    body: issueBody({ sessions: [{ date: '2026-09-02', start: '10:00', end: '11:00' }] }),
  };
  const result = run(issues);
  assert.equal(result.ok, true);
  assert.ok(result.warnings.some((w) => w.code === 'opportunistic-label-missing' && w.issue === 950));
  assert.ok(!result.failures.some((f) => f.issue === 950));
  // Its effort is still aggregated as opportunistic.
  assert.equal(result.opportunisticTrackedMinutes, 60);
});

// 8 — Same-window Issue not in sprint -> surfaced separately, formal scope untouched.
test('an in-window issue outside scope is reported separately without changing formal scope', () => {
  const issues = baseIssues();
  issues.push({
    number: 970,
    state: 'CLOSED',
    projectStatus: 'Done',
    projectIterationId: null,
    labels: ['investment: dev-platform'],
    body: issueBody({ sessions: [{ date: '2026-09-03', start: '13:00', end: '15:30' }] }),
  });
  const result = run(issues);
  assert.equal(result.ok, true);
  assert.equal(result.formalScope.total, 4);
  assert.deepEqual(result.sameWindowOutsideScope, [970]);
  assert.equal(result.otherSameWindowTrackedMinutes, 150);
  assert.ok(result.warnings.some((w) => w.code === 'same-window-outside-scope' && w.issue === 970));
});

test('an out-of-window issue outside scope is not counted as same-window activity', () => {
  const issues = baseIssues();
  issues.push({
    number: 971,
    state: 'CLOSED',
    projectStatus: 'Done',
    projectIterationId: null,
    labels: ['investment: dev-platform'],
    body: issueBody({ sessions: [{ date: '2026-07-01', start: '13:00', end: '15:30' }] }),
  });
  const result = run(issues);
  assert.deepEqual(result.sameWindowOutsideScope, []);
  assert.equal(result.otherSameWindowTrackedMinutes, 0);
});

test('same-window effort counts only the sessions dated inside the sprint window', () => {
  const issues = baseIssues();
  issues.push({
    number: 972,
    state: 'CLOSED',
    projectStatus: 'Done',
    projectIterationId: null,
    labels: ['investment: dev-platform'],
    body: issueBody({
      sessions: [
        { date: '2026-08-15', start: '09:00', end: '12:00' }, // 3h BEFORE the window
        { date: '2026-09-02', start: '09:00', end: '10:30' }, // 1.5h INSIDE the window
        { date: '2999-01-01', start: '09:00', end: '11:00' }, // 2h AFTER the window
      ],
    }),
  });
  const result = run(issues); // fixture sprint started 2026-09-01, today = 2026-09-05
  assert.deepEqual(result.sameWindowOutsideScope, [972]);
  // Only the 90-minute in-window session, not the 6h30m all-session total.
  assert.equal(result.otherSameWindowTrackedMinutes, 90);
});

// 9 — Malformed / missing Sessions -> metric confidence downgraded, not silently zero.
test('a scoped issue with malformed Sessions downgrades confidence and warns, without failing', () => {
  const issues = baseIssues();
  issues[0] = scopedIssue(900, { body: issueBody({ sessionsRaw: '[ {broken} ]' }) });
  const result = run(issues);
  assert.notEqual(result.metricConfidence, 'high');
  assert.ok(result.warnings.some((w) => w.code === 'metric-confidence'));
  assert.ok(!result.failures.some((f) => f.code === 'metric-confidence'));
  // #900 contributes 0 tracked minutes but that is disclosed via confidence,
  // not presented as a confident zero.
  assert.equal(result.formalTrackedMinutes, 180);
});

// Extra guards on the remaining issue #587 Phase 3 rules.
test('scoped issue still OPEN -> FAIL (scope-open)', () => {
  const issues = baseIssues();
  issues[0] = scopedIssue(900, { state: 'OPEN', projectStatus: 'In Progress' });
  const result = run(issues);
  assert.ok(result.failures.some((f) => f.code === 'scope-open' && f.issue === 900));
  assert.equal(result.formalScope.open, 1);
});

test('scoped issue with Project status other than Done -> FAIL (scope-not-done)', () => {
  const issues = baseIssues();
  issues[0] = scopedIssue(900, { state: 'CLOSED', projectStatus: 'Todo' });
  const result = run(issues);
  assert.ok(result.failures.some((f) => f.code === 'scope-not-done' && f.issue === 900));
});

test('closed scoped issue with an unset Project status -> FAIL, not a silent pass', () => {
  const issues = baseIssues();
  issues[0] = scopedIssue(900, { state: 'CLOSED', projectStatus: null });
  const result = run(issues);
  assert.ok(
    result.failures.some((f) => f.code === 'scope-not-done' && f.issue === 900 && /unset/.test(f.message)),
  );
});

test('an open sprint window ends at "today" — future-dated out-of-scope sessions are excluded', () => {
  const issues = baseIssues();
  issues.push({
    number: 980,
    state: 'CLOSED',
    projectStatus: 'Done',
    projectIterationId: null,
    labels: ['investment: dev-platform'],
    body: issueBody({ sessions: [{ date: '2999-01-01', start: '09:00', end: '10:00' }] }),
  });
  // No `today` override and the fixture sprint has no `completed` date.
  const result = auditSprint({ sprintDoc: SPRINT_DOC, issues, activeIteration: ITERATION });
  assert.deepEqual(result.sameWindowOutsideScope, []);
  assert.equal(result.otherSameWindowTrackedMinutes, 0);
});

test('an orphan issue with in-window sessions still contributes its tracked effort', () => {
  const issues = baseIssues();
  issues.push({
    number: 999,
    state: 'CLOSED',
    projectStatus: 'Done',
    projectIterationId: 'iter-42',
    labels: ['sprint-42', 'investment: product'],
    body: issueBody({ sessions: [{ date: '2026-09-03', start: '10:00', end: '12:00' }] }),
  });
  const result = run(issues);
  assert.deepEqual(result.orphans, [999]);
  assert.ok(result.warnings.some((w) => w.code === 'orphan' && w.issue === 999));
  // 120 min of orphan work is counted as same-window effort, not dropped.
  assert.equal(result.otherSameWindowTrackedMinutes, 120);
  // ...but an orphan is not also listed as a plain same-window issue.
  assert.deepEqual(result.sameWindowOutsideScope, []);
});

test('scoped issue not assigned to the sprint iteration -> FAIL (iteration-mismatch)', () => {
  const issues = baseIssues();
  issues[0] = scopedIssue(900, { projectIterationId: 'iter-41' });
  const result = run(issues);
  assert.ok(result.failures.some((f) => f.code === 'iteration-mismatch' && f.issue === 900));
  assert.deepEqual(result.missingIteration, [900]);
});

test('missing project iteration entirely -> FAIL (iteration-missing)', () => {
  const result = auditSprint({ sprintDoc: SPRINT_DOC, issues: baseIssues(), activeIteration: null, today: TODAY });
  assert.ok(result.failures.some((f) => f.code === 'iteration-missing'));
});

test('frontmatter scope_issues disagreeing with the scope table -> FAIL (scope-count-mismatch)', () => {
  const doc = { ...SPRINT_DOC, scopeIssuesDeclared: 7 };
  const result = auditSprint({ sprintDoc: doc, issues: baseIssues(), activeIteration: ITERATION, today: TODAY });
  assert.ok(result.failures.some((f) => f.code === 'scope-count-mismatch'));
});

test('a §13 Execution Evidence row with a non-final marker -> FAIL (evidence-row-pending)', () => {
  const doc = {
    ...SPRINT_DOC,
    executionEvidence: [
      { issue: 900, status: '✅' },
      { issue: 901, status: '🚧' },
      { issue: 902, status: '✅' },
      { issue: 903, status: '✅' },
      { issue: 950, status: '✅' },
    ],
  };
  const result = auditSprint({ sprintDoc: doc, issues: baseIssues(), activeIteration: ITERATION, today: TODAY });
  assert.ok(result.failures.some((f) => f.code === 'evidence-row-pending' && f.issue === 901));
});

test('a scoped issue with no §13 Execution Evidence row -> FAIL (evidence-row-missing)', () => {
  const doc = {
    ...SPRINT_DOC,
    executionEvidence: SPRINT_DOC.executionEvidence.filter((e) => e.issue !== 902),
  };
  const result = auditSprint({ sprintDoc: doc, issues: baseIssues(), activeIteration: ITERATION, today: TODAY });
  assert.ok(result.failures.some((f) => f.code === 'evidence-row-missing' && f.issue === 902));
});

test('an opportunistic issue with no §13 row -> WARN, not a failure', () => {
  const doc = {
    ...SPRINT_DOC,
    executionEvidence: SPRINT_DOC.executionEvidence.filter((e) => e.issue !== 950),
  };
  const result = auditSprint({ sprintDoc: doc, issues: baseIssues(), activeIteration: ITERATION, today: TODAY });
  assert.ok(result.warnings.some((w) => w.code === 'opportunistic-evidence-row-missing' && w.issue === 950));
  assert.ok(!result.failures.some((f) => f.issue === 950));
});

test('a sprint document with no parsed §13 rows at all -> WARN (evidence-section-missing)', () => {
  const doc = { ...SPRINT_DOC, executionEvidence: [] };
  const result = auditSprint({ sprintDoc: doc, issues: baseIssues(), activeIteration: ITERATION, today: TODAY });
  assert.ok(result.warnings.some((w) => w.code === 'evidence-section-missing'));
  // Absent section is a WARN, not a carpet of evidence-row-missing FAILs.
  assert.ok(!result.failures.some((f) => f.code === 'evidence-row-missing'));
});

test('a blank sprint "started" date -> FAIL (sprint-window-unknown)', () => {
  const doc = { ...SPRINT_DOC, started: '' };
  const result = auditSprint({ sprintDoc: doc, issues: baseIssues(), activeIteration: ITERATION, today: TODAY });
  assert.ok(result.failures.some((f) => f.code === 'sprint-window-unknown'));
});

test('a malformed sprint "started" date -> FAIL (sprint-window-unknown)', () => {
  const doc = { ...SPRINT_DOC, started: '2026-13-40' };
  const result = auditSprint({ sprintDoc: doc, issues: baseIssues(), activeIteration: ITERATION, today: TODAY });
  assert.ok(result.failures.some((f) => f.code === 'sprint-window-unknown'));
});

test('sprint window start after end -> FAIL (sprint-window-invalid)', () => {
  const doc = { ...SPRINT_DOC, started: '2026-10-01', completed: '2026-09-15' };
  const result = auditSprint({ sprintDoc: doc, issues: baseIssues(), activeIteration: ITERATION, today: TODAY });
  assert.ok(result.failures.some((f) => f.code === 'sprint-window-invalid'));
});

test('a present but malformed "completed" date -> FAIL (not silently replaced by today)', () => {
  const doc = { ...SPRINT_DOC, completed: '2026-02-31' };
  const result = auditSprint({ sprintDoc: doc, issues: baseIssues(), activeIteration: ITERATION, today: TODAY });
  assert.ok(result.failures.some((f) => f.code === 'sprint-window-invalid' && /completed/.test(f.message)));
});

test('a missing scope_issues declaration -> FAIL (scope-count-mismatch)', () => {
  const doc = { ...SPRINT_DOC, scopeIssuesDeclared: null };
  const result = auditSprint({ sprintDoc: doc, issues: baseIssues(), activeIteration: ITERATION, today: TODAY });
  assert.ok(result.failures.some((f) => f.code === 'scope-count-mismatch' && /no numeric/.test(f.message)));
});

test('a cross-repo scope ref is matched by repo+number, not number alone', () => {
  const doc = {
    ...SPRINT_DOC,
    scopeRefs: [{ repo: 'pakodiazdev/sushigo-dev-lab', number: 64 }],
    formalScopeIssues: [64],
    initialScopeCount: 1,
    opportunisticRefs: [],
    opportunisticIssues: [],
    scopeIssuesDeclared: 1,
    executionEvidence: [{ issue: 64, repo: 'pakodiazdev/sushigo-dev-lab', status: '✅' }],
  };
  const devLabIssue = {
    number: 64,
    repo: 'pakodiazdev/sushigo-dev-lab',
    state: 'CLOSED',
    projectStatus: 'Done',
    projectIterationId: 'iter-42',
    labels: ['sprint-42', 'investment: dev-platform'],
    body: issueBody({ sessions: [{ date: '2026-09-02', start: '10:00', end: '11:00' }] }),
  };
  // A DIFFERENT issue #64 in the default repo — must not satisfy the dev-lab ref.
  const decoy = { number: 64, state: 'OPEN', projectStatus: 'Todo', labels: [], body: '' };

  const ok = auditSprint({ sprintDoc: doc, issues: [devLabIssue], activeIteration: ITERATION, today: TODAY });
  assert.equal(ok.ok, true, JSON.stringify(ok.failures));

  const bad = auditSprint({ sprintDoc: doc, issues: [decoy], activeIteration: ITERATION, today: TODAY });
  assert.ok(bad.failures.some((f) => f.code === 'scope-no-evidence' && /sushigo-dev-lab#64/.test(f.message)));
});

test('a default-repo issue with the same number does not orphan-warn for a cross-repo scope ref', () => {
  const doc = {
    ...SPRINT_DOC,
    scopeRefs: [{ repo: 'pakodiazdev/sushigo-dev-lab', number: 64 }],
    formalScopeIssues: [64],
    initialScopeCount: 1,
    opportunisticRefs: [],
    opportunisticIssues: [],
    scopeIssuesDeclared: 1,
    executionEvidence: [{ issue: 64, repo: 'pakodiazdev/sushigo-dev-lab', status: '✅' }],
  };
  const devLabIssue = {
    number: 64, repo: 'pakodiazdev/sushigo-dev-lab', state: 'CLOSED', projectStatus: 'Done',
    projectIterationId: 'iter-42', labels: ['sprint-42', 'investment: dev-platform'],
    body: issueBody({ sessions: [{ date: '2026-09-02', start: '10:00', end: '11:00' }] }),
  };
  const defaultRepoSixtyFour = {
    number: 64, state: 'CLOSED', projectStatus: 'Done', projectIterationId: null,
    labels: ['investment: product'],
    body: issueBody({ sessions: [{ date: '2026-09-03', start: '09:00', end: '09:30' }] }),
  };
  const result = auditSprint({
    sprintDoc: doc, issues: [devLabIssue, defaultRepoSixtyFour], activeIteration: ITERATION, today: TODAY,
  });
  // The default-repo #64 is genuinely out-of-scope same-window work, reported as such.
  assert.deepEqual(result.sameWindowOutsideScope, [64]);
  assert.ok(result.failures.every((f) => f.code !== 'scope-no-evidence'));
});

test('a repo-less scope ref does not fall back to a same-numbered cross-repo issue', () => {
  const doc = {
    ...SPRINT_DOC,
    scopeRefs: [{ repo: null, number: 64 }],
    formalScopeIssues: [64],
    opportunisticRefs: [],
    opportunisticIssues: [],
    scopeIssuesDeclared: 1,
    initialScopeCount: 1,
    executionEvidence: [{ issue: 64, repo: null, status: '✅' }],
  };
  // Only a DIFFERENT-repo #64 is available; the default-repo #64 was not fetched.
  const crossRepo = {
    number: 64, repo: 'pakodiazdev/sushigo-dev-lab', state: 'CLOSED', projectStatus: 'Done',
    projectIterationId: 'iter-42', labels: ['sprint-42', 'investment: dev-platform'], body: '',
  };
  const result = auditSprint({ sprintDoc: doc, issues: [crossRepo], activeIteration: ITERATION, today: TODAY });
  assert.ok(result.failures.some((f) => f.code === 'scope-no-evidence' && f.issue === 64));
});

test('an explicitly-supplied invalid "today" override -> FAIL (sprint-window-invalid)', () => {
  const result = auditSprint({ sprintDoc: SPRINT_DOC, issues: baseIssues(), activeIteration: ITERATION, today: '2026-02-31' });
  assert.ok(result.failures.some((f) => f.code === 'sprint-window-invalid' && /today/.test(f.message)));
});

test('a malformed sprint number -> FAIL (sprint-number-invalid)', () => {
  const doc = { ...SPRINT_DOC, sprintNumber: null, sprint: '007foo', sprintNumberInvalid: true };
  const result = auditSprint({ sprintDoc: doc, issues: baseIssues(), activeIteration: ITERATION, today: TODAY });
  assert.ok(result.failures.some((f) => f.code === 'sprint-number-invalid'));
});

test('scope-count-mismatch compares scope_issues against the pre-§5.3 count', () => {
  // 4 scoped issues, scope_issues: 4, but §5.3 adds a 5th -> still no mismatch.
  const doc = {
    ...SPRINT_DOC,
    scopeRefs: [...SPRINT_DOC.scopeRefs, { repo: null, number: 999 }],
    initialScopeCount: 4,
    scopeIssuesDeclared: 4,
  };
  const issues = baseIssues().concat([{
    number: 999, state: 'CLOSED', projectStatus: 'Done', projectIterationId: 'iter-42',
    labels: ['sprint-42', 'investment: product'],
    body: issueBody({ sessions: [{ date: '2026-09-02', start: '10:00', end: '10:30' }] }),
  }]);
  doc.executionEvidence = [...SPRINT_DOC.executionEvidence, { issue: 999, repo: null, status: '✅' }];
  const result = auditSprint({ sprintDoc: doc, issues, activeIteration: ITERATION, today: TODAY });
  assert.ok(!result.failures.some((f) => f.code === 'scope-count-mismatch'));
});

test('a disposition pointing at a nonexistent issue -> WARN (deferral-target-missing)', () => {
  const issues = baseIssues();
  issues[2] = scopedIssue(902, {
    body: issueBody({
      sessions: [{ date: '2026-09-02', start: '10:00', end: '12:00' }],
      tasks: [
        { text: 'Shipped part', done: true },
        { text: 'Edge case — deferred to #99999', done: false },
      ],
    }),
  });
  const result = auditSprint({
    sprintDoc: SPRINT_DOC, issues, activeIteration: ITERATION, today: TODAY, missingRefs: [99999],
  });
  assert.ok(result.warnings.some((w) => w.code === 'deferral-target-missing' && w.issue === 902));
  // Still not a FAIL — the task carries an explicit disposition.
  assert.ok(!result.failures.some((f) => f.code === 'closed-with-undisposed-tasks' && f.issue === 902));
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { parseSprintDoc } = require('../parse-sprint-doc.js');
const { auditSprint } = require('../audit.js');
const { renderReport } = require('../render-report.js');
const { readFixture, issueBody, scopedIssue } = require('./helpers.js');

const SPRINT_DOC = parseSprintDoc(readFixture('sprint-042-example.md'));
const ITERATION = { id: 'iter-42', title: 'Sprint 42' };

function baseIssues() {
  return [900, 901, 902, 903].map((n) => scopedIssue(n)).concat([
    {
      number: 950,
      state: 'CLOSED',
      projectStatus: 'Done',
      projectIterationId: 'iter-42',
      labels: ['sprint-42', 'investment: dev-platform'],
      body: issueBody({ sessions: [{ date: '2026-09-02', start: '10:00', end: '11:00' }] }),
    },
  ]);
}

test('renderReport prints the closure-audit header, the metric block and a PASS verdict', () => {
  const result = auditSprint({ sprintDoc: SPRINT_DOC, issues: baseIssues(), activeIteration: ITERATION, today: '2026-09-05' });
  const text = renderReport(result);

  assert.match(text, /^Sprint 42 closure audit/);
  assert.match(text, /Formal scope\s+4 Issues/);
  assert.match(text, /Formal tracked\s+4h00m/);
  assert.match(text, /Opportunistic tracked\s+1h00m/);
  assert.match(text, /Metric confidence\s+high/);
  assert.match(text, /RESULT: PASS/);
});

test('renderReport lists FAIL items and prints a FAIL verdict when closure is blocked', () => {
  const issues = baseIssues();
  issues[0] = scopedIssue(900, { labels: ['sprint-42'] });
  const result = auditSprint({ sprintDoc: SPRINT_DOC, issues, activeIteration: ITERATION, today: '2026-09-05' });
  const text = renderReport(result);

  assert.match(text, /FAIL \(\d+\) — closure is blocked:/);
  assert.match(text, /\[investment-missing\]/);
  assert.match(text, /RESULT: FAIL/);
});

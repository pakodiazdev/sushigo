'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { parseArgs, resolveCurrentSprintDoc } = require('../generate.js');

test('parseArgs applies defaults and reads every flag', () => {
  const defaults = parseArgs([]);
  assert.equal(defaults.owner, 'pakodiazdev');
  assert.equal(defaults.repo, 'sushigo');
  assert.equal(defaults.projectNumber, 7);
  assert.equal(defaults.json, false);
  assert.equal(defaults.allowFail, false);

  const custom = parseArgs([
    '--sprint-doc', 'doc/sprints/sprint-009-x.md',
    '--owner', 'acme',
    '--repo', 'widgets',
    '--project', '12',
    '--today', '2026-09-05',
    '--json',
    '--allow-fail',
  ]);
  assert.equal(custom.sprintDoc, 'doc/sprints/sprint-009-x.md');
  assert.equal(custom.owner, 'acme');
  assert.equal(custom.repo, 'widgets');
  assert.equal(custom.projectNumber, 12);
  assert.equal(custom.today, '2026-09-05');
  assert.equal(custom.json, true);
  assert.equal(custom.allowFail, true);
});

test('parseArgs rejects an unknown flag', () => {
  assert.throws(() => parseArgs(['--nope']), /Unknown argument/);
});

test('a malformed sprint number produces a structured audit result, not a thrown error', () => {
  // parseSprintDoc + auditSprint must render a FAIL rather than crashing generate.js.
  const { parseSprintDoc } = require('../parse-sprint-doc.js');
  const { auditSprint } = require('../audit.js');
  const doc = parseSprintDoc('---\nsprint: "007foo"\nscope_issues: 0\n---\n## 5. Scope\n');
  assert.equal(doc.sprintNumber, null);
  const result = auditSprint({ sprintDoc: doc, issues: [], activeIteration: null });
  assert.equal(result.ok, false);
  assert.ok(result.failures.some((f) => f.code === 'sprint-number-invalid'));
});

test('resolveCurrentSprintDoc picks the highest-numbered sprint document', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sprint-audit-'));
  fs.mkdirSync(path.join(dir, 'doc', 'sprints'), { recursive: true });
  for (const name of ['sprint-006-a.md', 'sprint-007-b.md', 'sprint-010-c.md', 'README.md']) {
    fs.writeFileSync(path.join(dir, 'doc', 'sprints', name), '# x\n');
  }
  assert.equal(path.basename(resolveCurrentSprintDoc(dir)), 'sprint-010-c.md');
});

test('parseArgs rejects an option given without a value', () => {
  assert.throws(() => parseArgs(['--sprint-doc']), /requires a value/);
  assert.throws(() => parseArgs(['--owner', '--json']), /requires a value/);
});

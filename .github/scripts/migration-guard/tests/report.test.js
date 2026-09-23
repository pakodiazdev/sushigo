'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { renderReport } = require('../report.js');

const blocking = {
  path: 'code/api/database/migrations/2026_01_01_000000_drop_x.php',
  findings: [{ rule: 'drop-column', line: 12, snippet: "$table->dropColumn('x');" }],
  acknowledged: null,
  blocking: true,
};
const acked = {
  path: 'code/api/database/migrations/2026_01_02_000000_drop_y.php',
  findings: [{ rule: 'drop-table', line: 9, snippet: "Schema::dropIfExists('y');" }],
  acknowledged: 'table retired in #999',
  blocking: false,
};
const clean = { path: 'code/api/database/migrations/2026_01_03_000000_add_z.php', findings: [], acknowledged: null, blocking: false };

test('no migrations in range → passes with an explicit summary', () => {
  const r = renderReport([], 'block');
  assert.equal(r.failed, false);
  assert.match(r.summary, /No migrations changed/);
  assert.deepEqual(r.annotations, []);
});

test('clean migrations pass in block mode', () => {
  const r = renderReport([clean], 'block');
  assert.equal(r.failed, false);
  assert.match(r.summary, /1 migration\(s\) scanned — no destructive operations/);
});

test('block mode fails on an unacknowledged finding and emits error annotations', () => {
  const r = renderReport([blocking, acked, clean], 'block');
  assert.equal(r.failed, true);
  assert.deepEqual(r.annotations, [
    `::error file=${blocking.path},line=12,title=Destructive migration (drop-column)::$table->dropColumn('x');`,
    `::notice file=${acked.path},line=9,title=Acknowledged destructive migration (drop-table)::table retired in #999`,
  ]);
  assert.match(r.summary, /❌/);
  assert.match(r.summary, /migration-guard: allow/);
});

test('warn mode never fails and downgrades errors to warnings', () => {
  const r = renderReport([blocking], 'warn');
  assert.equal(r.failed, false);
  assert.match(r.annotations[0], /^::warning /);
  assert.match(r.summary, /⚠️/);
});

test('acknowledged-only findings pass in block mode', () => {
  const r = renderReport([acked], 'block');
  assert.equal(r.failed, false);
  assert.match(r.summary, /acknowledged/);
});

test('annotation messages are escaped for workflow commands', () => {
  const r = renderReport([{ ...blocking, findings: [{ rule: 'raw-sql', line: 1, snippet: 'a%b\r\nc' }] }], 'block');
  assert.ok(r.annotations[0].endsWith('::a%25b%0D%0Ac'));
});

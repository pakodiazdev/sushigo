'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  collectDatabaseFailures,
  buildDatabaseFailureMarkdown,
} = require('../db-failures.js');

const POISONED_RUN = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
  <testsuite name="phpunit.xml">
    <testsuite name="Feature">
      <testcase name="a_passing_test_right_before_the_failure" class="Tests\\Feature\\Inventory\\StockTest" time="0.05"/>
      <testcase name="it_rejects_a_duplicate_stock_row" class="Tests\\Feature\\Inventory\\StockTest">
        <error type="Illuminate\\Database\\UniqueConstraintViolationException">SQLSTATE[23505]: Unique violation: 7 ERROR: duplicate key value violates unique constraint "unique_stock_per_location"</error>
      </testcase>
      <testcase name="it_confirms_the_close" class="Tests\\Feature\\AttendancePayroll\\ConfirmCloseApiTest">
        <error type="Illuminate\\Database\\QueryException">SQLSTATE[25P02]: In failed sql transaction: 7 ERROR: current transaction is aborted, commands ignored until end of transaction block</error>
      </testcase>
      <testcase name="it_recloses_the_period" class="Tests\\Feature\\AttendancePayroll\\ReclosePayPeriodApiTest">
        <failure type="PHPUnit\\Framework\\ExpectationFailedException">SQLSTATE[25P02]: In failed sql transaction</failure>
      </testcase>
      <testcase name="it_passes" class="Tests\\Feature\\ExampleTest" time="0.1"/>
    </testsuite>
  </testsuite>
</testsuites>`;

const CLEAN_RUN = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
  <testsuite name="phpunit.xml">
    <testcase name="it_passes" class="Tests\\Feature\\ExampleTest" time="0.1"/>
    <testcase name="it_also_passes" class="Tests\\Unit\\ExampleTest" time="0.02"/>
  </testsuite>
</testsuites>`;

const NON_DB_FAILURE_RUN = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
  <testsuite name="phpunit.xml">
    <testcase name="it_asserts" class="Tests\\Unit\\ThingTest">
      <failure type="PHPUnit\\Framework\\ExpectationFailedException">Failed asserting that false is true.</failure>
    </testcase>
  </testsuite>
</testsuites>`;

// A shard whose ONLY database failures are aborted-transaction (25P02) noise —
// no independent root cause of its own.
const ABORTED_ONLY_RUN = `<?xml version="1.0"?>
<testsuites><testsuite name="x">
  <testcase name="a" class="Tests\\Feature\\Payroll\\ATest"><error>SQLSTATE[25P02]: current transaction is aborted</error></testcase>
  <testcase name="b" class="Tests\\Feature\\Payroll\\BTest"><error>SQLSTATE[25P02]: current transaction is aborted</error></testcase>
</testsuite></testsuites>`;

// A shard where a 25P02 is recorded BEFORE a real SQLSTATE — the earlier
// transaction was already aborted by an untagged trigger.
const ABORTED_THEN_REAL_RUN = `<?xml version="1.0"?>
<testsuites><testsuite name="x">
  <testcase name="swallows_then_asserts" class="Tests\\Feature\\A\\FirstTest"><failure>SQLSTATE[25P02]: current transaction is aborted</failure></testcase>
  <testcase name="hits_a_real_constraint" class="Tests\\Feature\\B\\SecondTest"><error>SQLSTATE[23505]: duplicate key value violates unique constraint "x_unique"</error></testcase>
</testsuite></testsuites>`;

const report = (shard, xml) => ({ shard, xml });

test('collectDatabaseFailures tags each failure with its shard and flags 25P02 as secondary', () => {
  const failures = collectDatabaseFailures([report('shard 1', POISONED_RUN)]);

  assert.equal(failures.length, 3);
  assert.deepEqual(failures[0], {
    shard: 'shard 1',
    class: 'Tests\\Feature\\Inventory\\StockTest',
    name: 'it_rejects_a_duplicate_stock_row',
    sqlstate: '23505',
    secondary: false,
  });
  assert.equal(failures[1].sqlstate, '25P02');
  assert.equal(failures[1].secondary, true);
  assert.equal(failures[2].secondary, true);
});

test('collectDatabaseFailures ignores passing tests and non-SQLSTATE failures', () => {
  assert.deepEqual(collectDatabaseFailures([report('shard 1', CLEAN_RUN)]), []);
  assert.deepEqual(collectDatabaseFailures([report('shard 1', NON_DB_FAILURE_RUN)]), []);
});

test('a self-closing passing testcase never absorbs the next testcase failure body', () => {
  const failures = collectDatabaseFailures([report('shard 1', POISONED_RUN)]);

  assert.equal(failures[0].name, 'it_rejects_a_duplicate_stock_row');
  assert.notEqual(failures[0].name, 'a_passing_test_right_before_the_failure');
});

test('buildDatabaseFailureMarkdown lists every failure per row, classified, with no cross-test cascade claim', () => {
  const markdown = buildDatabaseFailureMarkdown(collectDatabaseFailures([report('shard 1', POISONED_RUN)]));

  assert.match(markdown, /### shard 1/);
  // one row per failure, in execution order, each classified
  assert.match(markdown, /- `SQLSTATE\[23505\]` \(constraint\/query error\) — `Tests\\Feature\\Inventory\\StockTest::it_rejects_a_duplicate_stock_row`/);
  assert.match(markdown, /- `SQLSTATE\[25P02\]` \(aborted transaction\) — `Tests\\Feature\\AttendancePayroll\\ConfirmCloseApiTest::it_confirms_the_close`/);
  assert.match(markdown, /- `SQLSTATE\[25P02\]` \(aborted transaction\) — `Tests\\Feature\\AttendancePayroll\\ReclosePayPeriodApiTest::it_recloses_the_period`/);
  // a heuristic pointer, not a causal assertion
  assert.match(markdown, /Most likely root cause to check first: `SQLSTATE\[23505\]` in `Tests\\Feature\\Inventory\\StockTest::it_rejects_a_duplicate_stock_row`/);
  assert.match(markdown, /2 `SQLSTATE\[25P02\]` \(aborted-transaction\) failure\(s\): `RefreshDatabase` isolates/);
  // the word "cascade" only appears in the "NOT a cascade" caveat
  assert.doesNotMatch(markdown, /cascade from/);
});

test('buildDatabaseFailureMarkdown is empty when there are no database failures', () => {
  assert.equal(buildDatabaseFailureMarkdown(collectDatabaseFailures([report('shard 1', CLEAN_RUN)])), '');
});

test('an aborted-transaction-only shard lists its 25P02 rows and omits the root-cause pointer', () => {
  const markdown = buildDatabaseFailureMarkdown(collectDatabaseFailures([report('shard 3', ABORTED_ONLY_RUN)]));

  assert.match(markdown, /### shard 3/);
  assert.match(markdown, /- `SQLSTATE\[25P02\]` \(aborted transaction\) — `Tests\\Feature\\Payroll\\ATest::a`/);
  assert.match(markdown, /- `SQLSTATE\[25P02\]` \(aborted transaction\) — `Tests\\Feature\\Payroll\\BTest::b`/);
  assert.doesNotMatch(markdown, /Most likely root cause/);
  assert.match(markdown, /2 `SQLSTATE\[25P02\]` \(aborted-transaction\) failure\(s\)/);
});

test('a 25P02 recorded before a real SQLSTATE keeps its execution-order position and is not blamed on the later error', () => {
  const markdown = buildDatabaseFailureMarkdown(collectDatabaseFailures([report('shard 2', ABORTED_THEN_REAL_RUN)]));

  // rows appear in execution order: 25P02 first, then the 23505
  const abortedIdx = markdown.indexOf('FirstTest::swallows_then_asserts');
  const concreteIdx = markdown.indexOf('SecondTest::hits_a_real_constraint');
  assert.ok(abortedIdx > -1 && concreteIdx > -1 && abortedIdx < concreteIdx);
  // the concrete error is offered as the thing to check first — as a heuristic
  assert.match(markdown, /Most likely root cause to check first: `SQLSTATE\[23505\]` in `Tests\\Feature\\B\\SecondTest::hits_a_real_constraint`/);
  // no statement that the earlier 25P02 cascaded from the later 23505
  assert.doesNotMatch(markdown, /cascade from/);
});

test('failures from different shards are never blamed on one shard', () => {
  const markdown = buildDatabaseFailureMarkdown(collectDatabaseFailures([
    report('shard 1', POISONED_RUN),     // 23505 + 2 local 25P02
    report('shard 3', ABORTED_ONLY_RUN), // only 25P02, its OWN shard
  ]));

  const [shard1Block, shard3Block] = markdown.split('### shard 3');

  // shard 1 lists only its own failures...
  assert.match(shard1Block, /### shard 1/);
  assert.match(shard1Block, /SQLSTATE\[23505\]/);
  assert.match(shard1Block, /2 `SQLSTATE\[25P02\]` \(aborted-transaction\) failure\(s\)/);
  assert.doesNotMatch(shard1Block, /Payroll\\ATest/);

  // ...and shard 3's 25P02 rows stay under shard 3.
  assert.match(shard3Block, /- `SQLSTATE\[25P02\]` \(aborted transaction\) — `Tests\\Feature\\Payroll\\ATest::a`/);
});

test('buildDatabaseFailureMarkdown caps a very long per-shard list', () => {
  const many = Array.from({ length: 20 }, (_, i) =>
    `<testcase name="t${i}" class="C${i}"><error>SQLSTATE[23514]: check violation ${i}</error></testcase>`).join('');
  const xml = `<testsuites><testsuite name="x">${many}</testsuite></testsuites>`;

  const markdown = buildDatabaseFailureMarkdown(collectDatabaseFailures([report('shard 1', xml)]));

  assert.match(markdown, /…and 5 more/);
});

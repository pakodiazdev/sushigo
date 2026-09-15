'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { countXml, countFiles, classify } = require('../count-phpunit.js');

// Matches the real shape `_api-ci.yml` produces: an explicit shard file list passed on the
// command line nests every test class directly under one flat "CLI Arguments" root, with no
// intermediate <testsuite name="Unit">/<testsuite name="Feature"> grouping — classification must
// work from each per-class suite's own `file` attribute, not from suite names.
const FLAT_SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
  <testsuite name="CLI Arguments" tests="3" assertions="10" errors="0" failures="0" skipped="0" time="1">
    <testsuite name="Tests\\Unit\\ExampleTest" file="/repo/code/api/tests/Unit/ExampleTest.php" tests="1" assertions="2" errors="0" failures="0" skipped="0" time="0.1">
      <testcase name="it_works" file="/repo/code/api/tests/Unit/ExampleTest.php" line="10" class="Tests\\Unit\\ExampleTest" assertions="2" time="0.1"/>
    </testsuite>
    <testsuite name="Tests\\Feature\\FooTest" file="/repo/code/api/tests/Feature/FooTest.php" tests="2" assertions="8" errors="0" failures="0" skipped="0" time="0.9">
      <testcase name="it_does_a" file="/repo/code/api/tests/Feature/FooTest.php" line="20" class="Tests\\Feature\\FooTest" assertions="5" time="0.5"/>
      <testcase name="it_does_b" file="/repo/code/api/tests/Feature/FooTest.php" line="30" class="Tests\\Feature\\FooTest" assertions="3" time="0.4"/>
    </testsuite>
  </testsuite>
</testsuites>`;

test('classify buckets by file path substring, ignoring anything else', () => {
  assert.equal(classify('/repo/code/api/tests/Unit/FooTest.php'), 'unit');
  assert.equal(classify('/repo/code/api/tests/Feature/FooTest.php'), 'feature');
  assert.equal(classify('/repo/code/api/tests/Browser/FooTest.php'), null);
  assert.equal(classify(undefined), null);
});

test('countXml sums tests/assertions per bucket from the flat CLI-invocation shape', () => {
  const totals = countXml(FLAT_SAMPLE);
  assert.deepEqual(totals, {
    unit: { tests: 1, assertions: 2 },
    feature: { tests: 2, assertions: 8 },
  });
});

test('countXml ignores the outer wrapper suite (no file attribute)', () => {
  const totals = countXml(FLAT_SAMPLE);
  // The "CLI Arguments" suite's own tests="3" must not be double-counted on top of the
  // per-class 1 (unit) + 2 (feature) = 3 already summed.
  assert.equal(totals.unit.tests + totals.feature.tests, 3);
});

test('countFiles sums across multiple shard files with no double counting', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-badges-'));
  const shard1 = path.join(dir, 'shard-1.xml');
  const shard2 = path.join(dir, 'shard-2.xml');
  fs.writeFileSync(
    shard1,
    `<testsuites><testsuite name="CLI Arguments" tests="1" assertions="2"><testsuite name="A" file="/a/tests/Unit/A.php" tests="1" assertions="2"/></testsuite></testsuites>`,
  );
  fs.writeFileSync(
    shard2,
    `<testsuites><testsuite name="CLI Arguments" tests="1" assertions="3"><testsuite name="B" file="/a/tests/Feature/B.php" tests="1" assertions="3"/></testsuite></testsuites>`,
  );

  const totals = countFiles([shard1, shard2]);
  assert.deepEqual(totals, {
    unit: { tests: 1, assertions: 2 },
    feature: { tests: 1, assertions: 3 },
  });

  fs.rmSync(dir, { recursive: true, force: true });
});

test('countFiles skips a missing path instead of throwing', () => {
  const totals = countFiles(['/does/not/exist.xml']);
  assert.deepEqual(totals, {
    unit: { tests: 0, assertions: 0 },
    feature: { tests: 0, assertions: 0 },
  });
});

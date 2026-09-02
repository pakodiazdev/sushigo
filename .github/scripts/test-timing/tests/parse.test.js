'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseJunitXml, mergeParsed } = require('../parse.js');

const NESTED_SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
  <testsuite name="phpunit.xml" tests="2" assertions="2" errors="0" failures="0" skipped="0" time="0.242288">
    <testsuite name="Unit" tests="1" assertions="1" errors="0" failures="0" skipped="0" time="0.008124">
      <testsuite name="Tests\\Unit\\ExampleTest" file="tests/Unit/ExampleTest.php" tests="1" assertions="1" errors="0" failures="0" skipped="0" time="0.008124">
        <testcase name="test_that_true_is_true" file="tests/Unit/ExampleTest.php" line="12" class="Tests\\Unit\\ExampleTest" classname="Tests.Unit.ExampleTest" assertions="1" time="0.008124"/>
      </testsuite>
    </testsuite>
    <testsuite name="Feature" tests="1" assertions="1" errors="0" failures="0" skipped="0" time="0.234164">
      <testsuite name="Tests\\Feature\\ExampleTest" file="tests/Feature/ExampleTest.php" tests="1" assertions="1" errors="0" failures="0" skipped="0" time="0.234164">
        <testcase name="test_the_application_returns_a_successful_response" file="tests/Feature/ExampleTest.php" line="13" class="Tests\\Feature\\ExampleTest" classname="Tests.Feature.ExampleTest" assertions="1" time="0.234164"/>
      </testsuite>
    </testsuite>
  </testsuite>
</testsuites>`;

const CYPRESS_SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Mocha Tests" time="12.5" tests="3" failures="0">
  <testsuite name="Root Suite" tests="0" file="cypress/e2e/login.cy.ts" time="0"></testsuite>
  <testsuite name="login flow" tests="2" file="cypress/e2e/login.cy.ts" time="8">
    <testcase name="login flow logs the user in" time="5" classname="logs the user in"/>
    <testcase name="login flow rejects bad credentials" time="3" classname="rejects bad credentials"/>
  </testsuite>
  <testsuite name="dashboard" tests="1" file="cypress/e2e/dashboard.cy.ts" time="4.5">
    <testcase name="dashboard renders the widgets" time="4.5" classname="renders the widgets"/>
  </testsuite>
</testsuites>`;

test('parseJunitXml resolves each testcase spec file from the nearest enclosing <testsuite file=...>', () => {
  const { testcases } = parseJunitXml(CYPRESS_SAMPLE);

  assert.equal(testcases.length, 3);
  assert.deepEqual(
    testcases.map((testcase) => testcase.specFile),
    ['cypress/e2e/login.cy.ts', 'cypress/e2e/login.cy.ts', 'cypress/e2e/dashboard.cy.ts'],
  );
});

test('parseJunitXml prefers a testcase own file= attribute over the enclosing suite', () => {
  const xml = `<testsuites><testsuite name="s" file="cypress/e2e/outer.cy.ts">
    <testcase name="t" time="1" file="cypress/e2e/inner.cy.ts"/>
  </testsuite></testsuites>`;

  const { testcases } = parseJunitXml(xml);

  assert.equal(testcases[0].specFile, 'cypress/e2e/inner.cy.ts');
});

test('parseJunitXml leaves specFile null when no file= is available anywhere', () => {
  const xml = '<testsuites><testsuite name="s"><testcase name="t" time="1"/></testsuite></testsuites>';

  const { testcases } = parseJunitXml(xml);

  assert.equal(testcases[0].specFile, null);
});

test('parseJunitXml stops inheriting a suite file once its </testsuite> has closed', () => {
  const xml = `<testsuites>
    <testsuite name="a" file="cypress/e2e/a.cy.ts"><testcase name="ta" time="1"/></testsuite>
    <testsuite name="b"><testcase name="tb" time="1"/></testsuite>
  </testsuites>`;

  const { testcases } = parseJunitXml(xml);

  assert.equal(testcases[0].specFile, 'cypress/e2e/a.cy.ts');
  assert.equal(testcases[1].specFile, null);
});

test('parseJunitXml does not let a self-closing <testsuite/> unbalance the file stack', () => {
  const xml = `<testsuites>
    <testsuite name="empty" file="cypress/e2e/skipped.cy.ts"/>
    <testsuite name="real" file="cypress/e2e/real.cy.ts"><testcase name="t" time="1"/></testsuite>
  </testsuites>`;

  const { testcases } = parseJunitXml(xml);

  assert.equal(testcases.length, 1);
  assert.equal(testcases[0].specFile, 'cypress/e2e/real.cy.ts');
});

test('parseJunitXml sets specFile from a PHPUnit testcase own file attribute', () => {
  const { testcases } = parseJunitXml(NESTED_SAMPLE);

  assert.equal(testcases[0].specFile, 'tests/Unit/ExampleTest.php');
  assert.equal(testcases[1].specFile, 'tests/Feature/ExampleTest.php');
});

test('parseJunitXml extracts every leaf testcase with its duration', () => {
  const { testcases } = parseJunitXml(NESTED_SAMPLE);

  assert.equal(testcases.length, 2);
  assert.deepEqual(
    testcases.map((testcase) => testcase.name),
    ['test_that_true_is_true', 'test_the_application_returns_a_successful_response'],
  );
  assert.equal(testcases[1].time, 0.234164);
  assert.equal(testcases[1].class, 'Tests\\Feature\\ExampleTest');
});

test('parseJunitXml reads the root testsuite time and tests count', () => {
  const { suiteTime, totalTests } = parseJunitXml(NESTED_SAMPLE);

  assert.equal(suiteTime, 0.242288);
  assert.equal(totalTests, 2);
});

test('parseJunitXml reads Cypress aggregate totals from the <testsuites> root, not the zeroed "Root Suite"', () => {
  const { suiteTime, totalTests } = parseJunitXml(CYPRESS_SAMPLE);

  // <testsuites name="Mocha Tests" time="12.5" tests="3"> — must win over the inner
  // <testsuite name="Root Suite" tests="0" time="0"> that ROOT_SUITE_RE matches first.
  assert.equal(suiteTime, 12.5);
  assert.equal(totalTests, 3);
});

test('parseJunitXml falls back to summed/counted totals when <testsuites> carries no tests/time', () => {
  const xml = `<testsuites name="Mocha Tests">
    <testsuite name="s" file="cypress/e2e/a.cy.ts">
      <testcase name="one" time="1.5"/>
      <testcase name="two" time="0.5"/>
    </testsuite>
  </testsuites>`;

  const { suiteTime, totalTests } = parseJunitXml(xml);

  assert.equal(suiteTime, 2);
  assert.equal(totalTests, 2);
});

test('parseJunitXml still captures a failed testcase that wraps a <failure> child', () => {
  const xml = `<testsuites><testsuite name="root" tests="1" time="1.5">
    <testcase name="test_broken" class="Tests\\Feature\\BrokenTest" time="1.5">
      <failure type="RuntimeException">boom</failure>
    </testcase>
  </testsuite></testsuites>`;

  const { testcases } = parseJunitXml(xml);

  assert.equal(testcases.length, 1);
  assert.equal(testcases[0].name, 'test_broken');
  assert.equal(testcases[0].time, 1.5);
});

test('parseJunitXml returns an empty testcases array when there are none', () => {
  const xml = '<testsuites><testsuite name="root" tests="0" time="0"></testsuite></testsuites>';

  const { testcases, totalTests, suiteTime } = parseJunitXml(xml);

  assert.deepEqual(testcases, []);
  assert.equal(totalTests, 0);
  assert.equal(suiteTime, 0);
});

test('parseJunitXml falls back to summing testcase times when the root has no time attribute', () => {
  const xml = `<testsuites><testsuite name="root" tests="2">
    <testcase name="a" class="C" time="0.5"/>
    <testcase name="b" class="C" time="1.25"/>
  </testsuite></testsuites>`;

  const { suiteTime } = parseJunitXml(xml);

  assert.equal(suiteTime, 1.75);
});

test('mergeParsed concatenates testcases and sums suiteTime/totalTests across shards', () => {
  const shard1 = { testcases: [{ name: 'a', class: 'C1', time: 1 }], suiteTime: 1.5, totalTests: 1 };
  const shard2 = { testcases: [{ name: 'b', class: 'C2', time: 2 }], suiteTime: 2.5, totalTests: 1 };

  const merged = mergeParsed([shard1, shard2]);

  assert.deepEqual(
    merged.testcases.map((testcase) => testcase.name),
    ['a', 'b'],
  );
  assert.equal(merged.suiteTime, 4);
  assert.equal(merged.totalTests, 2);
});

test('mergeParsed returns an empty report for an empty list of shards', () => {
  const merged = mergeParsed([]);

  assert.deepEqual(merged.testcases, []);
  assert.equal(merged.suiteTime, 0);
  assert.equal(merged.totalTests, 0);
});

test('mergeParsed is a no-op wrapper around a single shard', () => {
  const shard = { testcases: [{ name: 'a', class: 'C1', time: 1 }], suiteTime: 1, totalTests: 1 };

  const merged = mergeParsed([shard]);

  assert.deepEqual(merged, shard);
});

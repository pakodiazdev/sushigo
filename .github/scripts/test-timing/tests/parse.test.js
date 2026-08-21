'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseJunitXml } = require('../parse.js');

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

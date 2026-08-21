'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSummaryMarkdown, formatSeconds, escapeMarkdownCell } = require('../report.js');

function testcase(name, time, klass = 'Tests\\Feature\\SomeTest') {
  return { name, class: klass, file: null, line: null, time };
}

test('buildSummaryMarkdown sorts by duration descending and truncates to topN', () => {
  const parsed = {
    testcases: [testcase('slow', 3), testcase('fast', 0.1), testcase('medium', 1)],
    suiteTime: 4.1,
    totalTests: 3,
  };

  const summary = buildSummaryMarkdown(parsed, 2);
  const slowLine = summary.split('\n').find((line) => line.includes('| slow |'));
  const mediumLine = summary.split('\n').find((line) => line.includes('| medium |'));

  assert.match(summary, /Top 2 Slowest Tests/);
  assert.ok(slowLine, 'the slowest test must appear in the table');
  assert.ok(mediumLine, 'the second-slowest test must appear in the table');
  assert.ok(!summary.includes('| fast |'), 'the fastest test must be truncated out of the top 2');
});

test('buildSummaryMarkdown computes aggregate totals and the top-N contribution percentage', () => {
  const parsed = {
    testcases: [testcase('a', 2), testcase('b', 2), testcase('c', 6)],
    suiteTime: 10.5,
    totalTests: 3,
  };

  const summary = buildSummaryMarkdown(parsed, 1);

  assert.match(summary, /Sum of individual test durations: 10\.00s/);
  assert.match(summary, /Reported suite duration.*10\.50s/);
  // top 1 ("c", 6s) out of a 10s sum of individual test durations = 60.0%
  assert.match(summary, /Top 1 contribution: 6\.00s \(60\.0% of total test time\)/);
});

test('buildSummaryMarkdown reports a graceful message when there are no testcases', () => {
  const summary = buildSummaryMarkdown({ testcases: [], suiteTime: 0, totalTests: 0 });

  assert.match(summary, /No test cases were found/);
});

test('formatSeconds always renders two decimal places', () => {
  assert.equal(formatSeconds(1), '1.00s');
  assert.equal(formatSeconds(0.005), '0.01s');
});

test('escapeMarkdownCell escapes pipe characters so a test name cannot break the table', () => {
  assert.equal(escapeMarkdownCell('test with | pipe'), 'test with \\| pipe');
});

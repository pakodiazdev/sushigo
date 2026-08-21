'use strict';

function formatSeconds(seconds) {
  return `${seconds.toFixed(2)}s`;
}

function escapeMarkdownCell(value) {
  return String(value).replace(/\|/g, '\\|');
}

function buildSummaryMarkdown({ testcases, suiteTime, totalTests }, topN = 20) {
  if (testcases.length === 0) {
    return [
      '## 🐢 PHPUnit Test Timing',
      '',
      'No test cases were found in the JUnit report — the suite may have failed before producing results.',
      '',
    ].join('\n');
  }

  const sorted = [...testcases].sort((a, b) => b.time - a.time);
  const top = sorted.slice(0, topN);
  const sumTestTime = testcases.reduce((sum, testcase) => sum + testcase.time, 0);
  const topTime = top.reduce((sum, testcase) => sum + testcase.time, 0);
  const topSharePercent = sumTestTime > 0 ? (topTime / sumTestTime) * 100 : 0;

  const rows = top.map(
    (testcase, index) =>
      `| ${index + 1} | ${formatSeconds(testcase.time)} | ${escapeMarkdownCell(testcase.class)} | ${escapeMarkdownCell(testcase.name)} |`,
  );

  return [
    `## 🐢 PHPUnit Test Timing — Top ${top.length} Slowest Tests`,
    '',
    '| # | Time | Class | Test |',
    '|---|---|---|---|',
    ...rows,
    '',
    '### Aggregate',
    `- Tests reported: ${totalTests}`,
    `- Sum of individual test durations: ${formatSeconds(sumTestTime)}`,
    `- Reported suite duration (PHPUnit \`testsuite\` time): ${formatSeconds(suiteTime)}`,
    `- Top ${top.length} contribution: ${formatSeconds(topTime)} (${topSharePercent.toFixed(1)}% of total test time)`,
    '',
  ].join('\n');
}

module.exports = { buildSummaryMarkdown, formatSeconds, escapeMarkdownCell };

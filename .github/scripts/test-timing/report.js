'use strict';

function formatSeconds(seconds) {
  return `${seconds.toFixed(2)}s`;
}

function escapeMarkdownCell(value) {
  return String(value).replace(/\|/g, '\\|');
}

function buildSpecFileRollup(testcases, topN) {
  const byFile = new Map();
  for (const testcase of testcases) {
    const key = testcase.specFile || testcase.file || '(unknown spec)';
    const current = byFile.get(key) ?? { time: 0, count: 0 };
    current.time += testcase.time;
    current.count += 1;
    byFile.set(key, current);
  }

  const rows = [...byFile.entries()]
    .sort((a, b) => b[1].time - a[1].time)
    .slice(0, topN)
    .map(
      ([file, agg], index) =>
        `| ${index + 1} | ${formatSeconds(agg.time)} | ${agg.count} | ${escapeMarkdownCell(file)} |`,
    );

  return [
    '### 🗂️ Slowest spec files (total time across all cases)',
    '',
    '| # | Total | Cases | Spec file |',
    '|---|---|---|---|',
    ...rows,
    '',
  ];
}

function buildSummaryMarkdown({ testcases, suiteTime, totalTests }, topN = 20, options = {}) {
  const { label = 'PHPUnit', groupByFile = false } = options;

  if (testcases.length === 0) {
    return [
      `## 🐢 ${label} Test Timing`,
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

  const lines = [
    `## 🐢 ${label} Test Timing — Top ${top.length} Slowest Tests`,
    '',
    '| # | Time | Class | Test |',
    '|---|---|---|---|',
    ...rows,
    '',
    '### Aggregate',
    `- Tests reported: ${totalTests}`,
    `- Sum of individual test durations: ${formatSeconds(sumTestTime)}`,
    `- Reported suite duration (reporter total): ${formatSeconds(suiteTime)}`,
    `- Top ${top.length} contribution: ${formatSeconds(topTime)} (${topSharePercent.toFixed(1)}% of total test time)`,
    '',
  ];

  if (groupByFile) {
    lines.push(...buildSpecFileRollup(testcases, topN));
  }

  return lines.join('\n');
}

module.exports = { buildSummaryMarkdown, formatSeconds, escapeMarkdownCell };

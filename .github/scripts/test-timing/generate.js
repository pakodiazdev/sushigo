#!/usr/bin/env node
'use strict';

const fs = require('node:fs');

const { parseJunitXml } = require('./parse.js');
const { buildSummaryMarkdown } = require('./report.js');

const TOP_N = Number(process.env.TEST_TIMING_TOP_N || 20);

function main() {
  const junitPath = process.argv[2];
  if (!junitPath) {
    throw new Error('Usage: node generate.js <path-to-junit-xml>');
  }

  if (!fs.existsSync(junitPath)) {
    console.log(`No JUnit report found at ${junitPath} — skipping test timing summary.`);
    return;
  }

  const xml = fs.readFileSync(junitPath, 'utf8');
  const parsed = parseJunitXml(xml);
  const summary = buildSummaryMarkdown(parsed, TOP_N);

  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (summaryFile) {
    fs.appendFileSync(summaryFile, `${summary}\n`);
  } else {
    console.log(summary);
  }
}

// This step runs with `if: always()` so a failed test run still surfaces timing data — a bug in
// the parser itself must never fail the CI job, only skip the diagnostic summary.
try {
  main();
} catch (error) {
  console.error(`::warning::Failed to generate test timing summary: ${error.message}`);
}

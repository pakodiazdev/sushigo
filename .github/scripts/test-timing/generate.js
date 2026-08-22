#!/usr/bin/env node
'use strict';

const fs = require('node:fs');

const { parseJunitXml, mergeParsed } = require('./parse.js');
const { buildSummaryMarkdown } = require('./report.js');

function parsePositiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

const TOP_N = parsePositiveInt(process.env.TEST_TIMING_TOP_N, 20);

function main() {
  // One path per shard (api-tests.yml's `matrix.shard` strategy, #481) — the shell expands the
  // workflow's `test-results-shard-*.xml` glob before this process ever starts, so argv already
  // holds the real file list; a single path (the pre-#481 invocation) still works unchanged.
  const junitPaths = process.argv.slice(2);
  if (junitPaths.length === 0) {
    throw new Error('Usage: node generate.js <path-to-junit-xml> [more-junit-xml...]');
  }

  const existingPaths = junitPaths.filter((junitPath) => fs.existsSync(junitPath));
  if (existingPaths.length === 0) {
    console.log(`No JUnit report found at ${junitPaths.join(', ')} — skipping test timing summary.`);
    return;
  }

  const parsedReports = existingPaths.map((junitPath) => parseJunitXml(fs.readFileSync(junitPath, 'utf8')));
  const parsed = mergeParsed(parsedReports);
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
  console.error(`::warning::Failed to generate test timing summary: ${errorMessage(error)}`);
}

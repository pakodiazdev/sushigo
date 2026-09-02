#!/usr/bin/env node
'use strict';

const fs = require('node:fs');

const { parseJunitXml, mergeParsed } = require('./parse.js');
const { buildSummaryMarkdown } = require('./report.js');
const { collectDatabaseFailures, buildDatabaseFailureMarkdown } = require('./db-failures.js');

function parsePositiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

// `test-results-shard-3.xml` -> `shard 3`; anything without a shard marker
// (the pre-#481 single-file invocation) -> `this run`.
function shardLabelFromPath(filePath) {
  const base = String(filePath).replace(/^.*[\\/]/, '');
  const match = base.match(/shard[-_]?([A-Za-z0-9]+)/i);
  return match ? `shard ${match[1]}` : 'this run';
}

const TOP_N = parsePositiveInt(process.env.TEST_TIMING_TOP_N, 20);
// `_api-ci.yml` leaves both unset → the PHPUnit heading and no per-file rollup, unchanged.
// `_e2e-ci.yml`'s cypress-timing step sets TEST_TIMING_LABEL=Cypress and
// TEST_TIMING_GROUP_BY_FILE=true so the summary is titled for Cypress and adds a
// slowest-spec-files table (the useful unit when every .cy.ts boots its own stack).
const LABEL = process.env.TEST_TIMING_LABEL || 'PHPUnit';
const GROUP_BY_FILE = process.env.TEST_TIMING_GROUP_BY_FILE === 'true';

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

  const reports = existingPaths.map((junitPath) => ({
    shard: shardLabelFromPath(junitPath),
    xml: fs.readFileSync(junitPath, 'utf8'),
  }));
  const parsed = mergeParsed(reports.map((report) => parseJunitXml(report.xml)));
  const summary = buildSummaryMarkdown(parsed, TOP_N, { label: LABEL, groupByFile: GROUP_BY_FILE });

  // Issue #578: surface each shard's first database-level failure (its SQLSTATE)
  // ahead of the timing table, distinct from the aborted-transaction errors it
  // cascades into, so a poisoned-transaction run is triaged from the root cause
  // — per shard, since shards have independent databases. Only meaningful for the
  // PHPUnit invocation (`_api-ci.yml`); the Cypress invocation (`_e2e-ci.yml`,
  // TEST_TIMING_LABEL=Cypress) has no PostgreSQL SQLSTATE failures to classify.
  const dbFailureSummary = LABEL === 'PHPUnit'
    ? buildDatabaseFailureMarkdown(collectDatabaseFailures(reports))
    : '';

  const combined = dbFailureSummary ? `${dbFailureSummary}\n${summary}` : summary;

  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (summaryFile) {
    fs.appendFileSync(summaryFile, `${combined}\n`);
  } else {
    console.log(combined);
  }
}

// This step runs with `if: always()` so a failed test run still surfaces timing data — a bug in
// the parser itself must never fail the CI job, only skip the diagnostic summary.
try {
  main();
} catch (error) {
  console.error(`::warning::Failed to generate test timing summary: ${errorMessage(error)}`);
}

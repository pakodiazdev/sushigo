'use strict';

// Counts PHPUnit test/assertion totals split by Unit vs Feature, from the JUnit XML
// `--log-junit` produces. `_api-ci.yml` invokes PHPUnit with an explicit shard file list
// (`vendor/bin/phpunit ... $(cat /tmp/shard-files.txt)`), which nests every test class
// directly under one flat "CLI Arguments" <testsuite> — there is no intermediate <testsuite
// name="Unit">/<testsuite name="Feature"> grouping to key off. Classification is therefore by
// each per-class <testsuite file="..."> element's own file path, not by suite name — this also
// keeps the count correct if the file-list invocation shape ever changes.
//
// A shard's JUnit file only ever contains the subset of test classes routed to that shard
// (file-level round-robin sharding, #481), so summing every shard's counts gives the true
// sprint-wide total with no double counting.

const fs = require('node:fs');

const SUITE_RE = /<testsuite\b([^>]*?)\/?>/g;
const ATTR_RE = /([\w-]+)="([^"]*)"/g;

function parseAttributes(attrString) {
  const attrs = {};
  let match;
  ATTR_RE.lastIndex = 0;
  while ((match = ATTR_RE.exec(attrString)) !== null) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}

function classify(filePath) {
  if (!filePath) return null;
  const normalized = filePath.replace(/\\/g, '/');
  if (normalized.includes('/tests/Unit/')) return 'unit';
  if (normalized.includes('/tests/Feature/')) return 'feature';
  return null;
}

function emptyTotals() {
  return {
    unit: { tests: 0, assertions: 0 },
    feature: { tests: 0, assertions: 0 },
  };
}

function countXml(xml) {
  const totals = emptyTotals();
  let match;
  SUITE_RE.lastIndex = 0;
  while ((match = SUITE_RE.exec(xml)) !== null) {
    const attrs = parseAttributes(match[1]);
    const bucket = classify(attrs.file);
    if (!bucket) continue;
    totals[bucket].tests += Number(attrs.tests || 0);
    totals[bucket].assertions += Number(attrs.assertions || 0);
  }
  return totals;
}

function countFiles(paths) {
  const combined = emptyTotals();
  for (const filePath of paths) {
    if (!fs.existsSync(filePath)) continue;
    const xml = fs.readFileSync(filePath, 'utf8');
    const totals = countXml(xml);
    combined.unit.tests += totals.unit.tests;
    combined.unit.assertions += totals.unit.assertions;
    combined.feature.tests += totals.feature.tests;
    combined.feature.assertions += totals.feature.assertions;
  }
  return combined;
}

function main() {
  const paths = process.argv.slice(2);
  if (paths.length === 0) {
    throw new Error('Usage: node count-phpunit.js <junit-xml-path> [more-junit-xml...]');
  }

  const totals = countFiles(paths);
  const lines = [
    `unit_tests=${totals.unit.tests}`,
    `unit_assertions=${totals.unit.assertions}`,
    `feature_tests=${totals.feature.tests}`,
    `feature_assertions=${totals.feature.assertions}`,
  ];

  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    fs.appendFileSync(outputFile, `${lines.join('\n')}\n`);
  }
  console.log(lines.join('\n'));
}

if (require.main === module) {
  main();
}

module.exports = { countXml, countFiles, classify };

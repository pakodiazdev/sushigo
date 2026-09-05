#!/usr/bin/env node
'use strict';

// CI entrypoint: for a [ci-check] / draft-default run, resolves the per-surface
// test files this PR added/modified and appends
//   api_test_files=<comma-separated repo-relative *Test.php paths>
//   webapp_test_files=<comma-separated repo-relative *.test.ts(x) paths>
//   api_test_files_empty=true|false
//   webapp_test_files_empty=true|false
// to $GITHUB_OUTPUT (or stdout locally). Consumed by the `analyze-pr` job.
//
//   CHANGED_JSON - JSON array of every repo-relative path the PR changed
//                  (dorny/paths-filter api_files + webapp_files, merged by the workflow)

const fs = require('node:fs');
const { apiTestFiles, webappTestFiles } = require('./changed-tests.js');

function parseChangedFiles(raw) {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    return raw.split(/[\s,]+/).filter(Boolean);
  }
}

const changed = parseChangedFiles(process.env.CHANGED_JSON);
const api = apiTestFiles(changed);
const webapp = webappTestFiles(changed);

const lines = [
  `api_test_files=${api.join(',')}`,
  `webapp_test_files=${webapp.join(',')}`,
  `api_test_files_empty=${api.length === 0}`,
  `webapp_test_files_empty=${webapp.length === 0}`,
  '',
].join('\n');

const outputFile = process.env.GITHUB_OUTPUT;
if (outputFile) {
  fs.appendFileSync(outputFile, lines);
}
process.stdout.write(lines);

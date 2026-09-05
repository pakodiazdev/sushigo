#!/usr/bin/env node
'use strict';

// CI entrypoint: resolves the Cypress selection for this PR CI run and appends
//   e2e_selection=none|pr-specs|full
//   e2e_specs=<newline-free, comma-separated repo-relative paths>
//   e2e_specs_empty=true|false
//   e2e_reason=<one line>
// to $GITHUB_OUTPUT (or stdout locally). Consumed by the `analyze-pr` job.
//
//   MODE          - the effective E2E intent (print-mode.js's `e2e_intent`:
//                   none | pr-specs | full)
//   CHANGED_JSON  - JSON array of every repo-relative code path the PR changed
//                   (dorny/paths-filter api_files + webapp_files, merged by the workflow)
//   INFRA_CHANGED - 'true' when the workflow's `infra` filter matched (docker, reusable
//                   workflows, ci-analyze scripts)

const fs = require('node:fs');
const { selectE2e } = require('./select-e2e.js');

function parseChangedFiles(raw) {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    // Fall back to a whitespace/comma-separated list.
    return raw.split(/[\s,]+/).filter(Boolean);
  }
}

const mode = process.env.MODE || 'full';
const changedFiles = parseChangedFiles(process.env.CHANGED_JSON);
const infraChanged = process.env.INFRA_CHANGED === 'true';

const result = selectE2e({ mode, changedFiles, infraChanged });

const lines = [
  `e2e_selection=${result.selection}`,
  `e2e_specs=${result.specs.join(',')}`,
  `e2e_specs_empty=${result.specsEmpty}`,
  `e2e_reason=${result.reason.replace(/\r?\n/g, ' ')}`,
  '',
].join('\n');

const outputFile = process.env.GITHUB_OUTPUT;
if (outputFile) {
  fs.appendFileSync(outputFile, lines);
}
process.stdout.write(lines);

#!/usr/bin/env node
'use strict';

// CI entrypoint: resolves the PR CI execution model (#598) and appends
//   modifier=skip-ci|ci-check|ci-check-all|none
//   is_draft=true|false
//   run_lint=true|false
//   test_scope=none|changed|full
//   e2e_intent=none|pr-specs|full
//   ci_gate=skip|evaluate
//   shallow_on_ready=true|false
// to the file named by $GITHUB_OUTPUT (or stdout when run locally). Consumed by
// the `analyze-pr` job in .github/workflows/ci.yml.
//
//   PR_TITLE      - github.event.pull_request.title   (empty on push events)
//   PR_IS_DRAFT   - github.event.pull_request.draft    (empty on push events)
//   EVENT_NAME    - github.event_name
//   INFRA_CHANGED - analyze-pr's `infra` paths-filter output ('true'/'false')

const fs = require('node:fs');
const { resolveCi } = require('./parse-mode.js');

const r = resolveCi({
  title: process.env.PR_TITLE || '',
  isDraft: process.env.PR_IS_DRAFT || '',
  eventName: process.env.EVENT_NAME || '',
  infraChanged: process.env.INFRA_CHANGED || '',
});

const lines = [
  `modifier=${r.modifier || 'none'}`,
  `is_draft=${r.isDraft}`,
  `run_lint=${r.runLint}`,
  `test_scope=${r.testScope}`,
  `e2e_intent=${r.e2eIntent}`,
  `ci_gate=${r.ciGate}`,
  `shallow_on_ready=${r.shallowOnReady}`,
  '',
].join('\n');

const outputFile = process.env.GITHUB_OUTPUT;
if (outputFile) {
  fs.appendFileSync(outputFile, lines);
}
process.stdout.write(lines);

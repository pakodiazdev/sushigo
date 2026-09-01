#!/usr/bin/env node
'use strict';

// CI entrypoint: resolves the PR execution mode and appends `mode=<value>` to the
// file named by $GITHUB_OUTPUT (or stdout when run locally). Consumed by the
// `analyze-pr` job in .github/workflows/ci.yml.
//
//   PR_TITLE   - github.event.pull_request.title  (empty on push events)
//   EVENT_NAME - github.event_name

const fs = require('node:fs');
const { parseMode } = require('./parse-mode.js');

const eventName = process.env.EVENT_NAME || '';
const title = process.env.PR_TITLE || '';

// Only pull_request events carry a title-driven mode. Everything else (push to
// main, workflow_dispatch, …) is a full run.
const mode = eventName === 'pull_request' ? parseMode(title) : 'final';

const line = `mode=${mode}\n`;
const outputFile = process.env.GITHUB_OUTPUT;
if (outputFile) {
  fs.appendFileSync(outputFile, line);
}
process.stdout.write(line);

#!/usr/bin/env node
'use strict';

// CI entrypoint: appends `verify_needed=<true|false>` to $GITHUB_OUTPUT (or stdout locally).
// Consumed by the `analyze-pr` job in .github/workflows/ci.yml.
//
//   API / WEBAPP / INFRA / SCRIPTS  - the dorny/paths-filter boolean outputs ('true'/'false')

const fs = require('node:fs');
const { verifyNeeded } = require('./verify-scope.js');

const result = verifyNeeded({
  apiChanged: process.env.API,
  webappChanged: process.env.WEBAPP,
  infraChanged: process.env.INFRA,
  scriptsChanged: process.env.SCRIPTS,
});

const line = `verify_needed=${result}\n`;
const outputFile = process.env.GITHUB_OUTPUT;
if (outputFile) {
  fs.appendFileSync(outputFile, line);
}
process.stdout.write(line);

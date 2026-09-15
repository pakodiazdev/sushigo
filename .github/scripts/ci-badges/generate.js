#!/usr/bin/env node
'use strict';

// Renders the five self-hosted CI badges (backend Lint/Test, frontend Lint/Test, Cypress) from
// this run's job results/outputs and writes them under .github/badges/. Only a surface whose
// job actually ran this push (result is 'success' or 'failure') gets a file written — a surface
// ci.yml's analyze-pr legitimately skipped (e.g. a webapp-only push skips api-ci entirely)
// leaves its existing badge on the `badges` branch untouched, the same way the iteration
// progress badge's own workflow only ever amends the file(s) it actually regenerated.

const fs = require('node:fs');
const path = require('node:path');

const { renderStatusBadge } = require('./render-badge.js');

const OUTPUT_DIR = path.join(__dirname, '..', '..', 'badges');

function hasFreshResult(result) {
  return result === 'success' || result === 'failure';
}

function statusFrom(result) {
  return result === 'success' ? 'success' : 'failure';
}

function writeBadge(fileName, svg) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outputPath = path.join(OUTPUT_DIR, fileName);
  fs.writeFileSync(outputPath, svg);
  console.log(`Wrote ${outputPath}`);
}

function generateApiBadges(env) {
  if (hasFreshResult(env.API_LINT_RESULT)) {
    writeBadge(
      'api-lint.svg',
      renderStatusBadge({
        label: 'lint',
        message: env.API_LINT_RESULT === 'success' ? 'passing' : 'failing',
        status: statusFrom(env.API_LINT_RESULT),
      }),
    );
  }

  if (hasFreshResult(env.API_RESULT)) {
    const featureTests = Number(env.API_FEATURE_TESTS || 0);
    const unitTests = Number(env.API_UNIT_TESTS || 0);
    const totalAssertions = Number(env.API_FEATURE_ASSERTIONS || 0) + Number(env.API_UNIT_ASSERTIONS || 0);
    writeBadge(
      'api-tests.svg',
      renderStatusBadge({
        label: 'tests',
        message: `Feature ${featureTests} · Unit ${unitTests} (${totalAssertions} asserts)`,
        status: statusFrom(env.API_RESULT),
      }),
    );
  }
}

function generateWebappBadges(env) {
  if (hasFreshResult(env.WEBAPP_LINT_RESULT)) {
    writeBadge(
      'webapp-lint.svg',
      renderStatusBadge({
        label: 'lint',
        message: env.WEBAPP_LINT_RESULT === 'success' ? 'passing' : 'failing',
        status: statusFrom(env.WEBAPP_LINT_RESULT),
      }),
    );
  }

  if (hasFreshResult(env.WEBAPP_RESULT)) {
    const testsTotal = Number(env.WEBAPP_TESTS_TOTAL || 0);
    writeBadge(
      'webapp-tests.svg',
      renderStatusBadge({
        label: 'tests',
        message: `${testsTotal} tests`,
        status: statusFrom(env.WEBAPP_RESULT),
      }),
    );
  }
}

function generateCypressBadge(env) {
  if (!hasFreshResult(env.E2E_RESULT)) return;
  const specCount = Number(env.E2E_SPEC_COUNT || 0);
  writeBadge(
    'cypress.svg',
    renderStatusBadge({
      label: 'cypress',
      message: `${specCount} specs ${env.E2E_RESULT === 'success' ? 'passing' : 'failing'}`,
      status: statusFrom(env.E2E_RESULT),
    }),
  );
}

function main() {
  generateApiBadges(process.env);
  generateWebappBadges(process.env);
  generateCypressBadge(process.env);
}

if (require.main === module) {
  main();
}

module.exports = { generateApiBadges, generateWebappBadges, generateCypressBadge, hasFreshResult };

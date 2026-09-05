'use strict';

// Picks the per-surface test files out of a PR's changed-file list, for a
// [ci-check] / draft-default run (#598): the effective test set is exactly the
// test files that literally appear in the diff (no coverage-based impact
// analysis — see the issue's "Out of Scope").
//
//   API    — PHPUnit *Test.php under code/api/tests/**
//   Webapp — Vitest *.test.ts(x) under code/webapp/** (Cypress *.cy.ts specs are
//            excluded here; _e2e-ci.yml selects those separately from the same diff)

const API_TEST = /^code\/api\/tests\/.+Test\.php$/;
const WEBAPP_TEST = /^code\/webapp\/(?!cypress\/).+\.test\.tsx?$/;

function asArray(files) {
  return Array.isArray(files) ? files.filter((f) => typeof f === 'string') : [];
}

/** @param {unknown} files repo-relative paths the PR added/modified/renamed */
function apiTestFiles(files) {
  return asArray(files).filter((f) => API_TEST.test(f));
}

/** @param {unknown} files repo-relative paths the PR added/modified/renamed */
function webappTestFiles(files) {
  return asArray(files).filter((f) => WEBAPP_TEST.test(f));
}

module.exports = { apiTestFiles, webappTestFiles };

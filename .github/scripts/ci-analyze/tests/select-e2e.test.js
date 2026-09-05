'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { selectE2e } = require('../select-e2e.js');

function call(mode, changedFiles, infraChanged = false) {
  return selectE2e({ mode, changedFiles, infraChanged });
}

// ---- 'none' ----------------------------------------------------------------

test("'none' runs no Cypress, whatever changed", () => {
  const r = call('none', [
    'code/webapp/cypress/e2e/login.cy.ts',
    'code/api/app/Models/Item.php',
  ]);
  assert.equal(r.selection, 'none');
  assert.deepEqual(r.specs, []);
  assert.equal(r.specsEmpty, true);
});

// ---- 'pr-specs' -----------------------------------------------------------

test("'pr-specs' runs only the Cypress specs added/modified by the PR", () => {
  const r = call('pr-specs', [
    'code/webapp/cypress/e2e/attendance-checkin.cy.ts',
    'code/webapp/cypress/e2e/login.cy.ts',
    'code/api/app/Actions/Attendances/CheckIn.php',
  ]);
  assert.equal(r.selection, 'pr-specs');
  assert.deepEqual(r.specs, [
    'code/webapp/cypress/e2e/attendance-checkin.cy.ts',
    'code/webapp/cypress/e2e/login.cy.ts',
  ]);
  assert.equal(r.specsEmpty, false);
});

test("'pr-specs' with zero changed specs is 'none' — NOT a failure (empty-guard is gone)", () => {
  const r = call('pr-specs', ['code/api/app/Actions/Attendances/CheckIn.php', 'doc/x.md']);
  assert.equal(r.selection, 'none');
  assert.equal(r.specsEmpty, true);
  assert.doesNotMatch(r.reason, /fail/i);
});

test("'pr-specs' de-duplicates and keeps a stable order", () => {
  const r = call('pr-specs', [
    'code/webapp/cypress/e2e/b.cy.ts',
    'code/webapp/cypress/e2e/a.cy.ts',
    'code/webapp/cypress/e2e/b.cy.ts',
  ]);
  assert.deepEqual(r.specs, [
    'code/webapp/cypress/e2e/b.cy.ts',
    'code/webapp/cypress/e2e/a.cy.ts',
  ]);
});

// ---- 'full' -------------------------------------------------------------

test("'full' runs the whole suite whenever anything E2E-relevant changed", () => {
  assert.equal(call('full', ['code/api/app/Models/Item.php']).selection, 'full');
  assert.equal(call('full', ['code/webapp/src/main.tsx']).selection, 'full');
  assert.equal(call('full', ['code/webapp/cypress/e2e/home.cy.ts']).selection, 'full');
});

test("'full' with only non-code changes runs no E2E", () => {
  const r = call('full', ['doc/x.md', 'README.md', '.github/workflows/deploy-preview.yml']);
  assert.equal(r.selection, 'none');
});

test("'full' returns no explicit spec list (the reusable workflow finds them all)", () => {
  const r = call('full', ['code/api/app/Models/Item.php']);
  assert.deepEqual(r.specs, []);
  assert.equal(r.specsEmpty, false);
});

test('infraChanged forces the full suite for a full run even with no code/spec change', () => {
  const r = call('full', ['docker/app/Dockerfile'], true);
  assert.equal(r.selection, 'full');
  assert.match(r.reason, /infra/i);
});

test('infraChanged is irrelevant to a pr-specs run', () => {
  assert.equal(call('pr-specs', ['docker-compose.e2e.yml'], true).selection, 'none');
  assert.equal(
    call('pr-specs', ['code/webapp/cypress/e2e/login.cy.ts'], true).selection,
    'pr-specs',
  );
});

// ---- shared ------------------------------------------------------------

test('an unknown mode is treated as full (conservative)', () => {
  assert.equal(call('banana', ['code/api/app/Models/Item.php']).selection, 'full');
});

test('a missing or empty changedFiles list is handled as no change', () => {
  assert.equal(selectE2e({ mode: 'full', changedFiles: [] }).selection, 'none');
  assert.equal(selectE2e({ mode: 'pr-specs', changedFiles: undefined }).selection, 'none');
});

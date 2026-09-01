'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { selectE2e } = require('../select-e2e.js');

const IMPACT_MAP = {
  entries: [
    {
      when: ['code/api/app/**/Payroll*', 'code/api/app/**/Payroll*/**', 'code/webapp/src/**/payroll/**'],
      run: ['code/webapp/cypress/e2e/payroll-*.cy.ts'],
    },
    {
      when: ['code/api/app/**/Attendance*/**', 'code/webapp/src/**/attendance/**'],
      run: ['code/webapp/cypress/e2e/attendance-*.cy.ts'],
    },
  ],
};

function call(mode, changedFiles, infraChanged = false) {
  return selectE2e({ mode, changedFiles, impactMap: IMPACT_MAP, infraChanged });
}

// ---- [e2e-test] --------------------------------------------------------------

test('[e2e-test] runs only the Cypress specs added/modified by the PR', () => {
  const r = call('e2e-test', [
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

test('[e2e-test] with zero changed Cypress specs reports an empty selection to fail on', () => {
  const r = call('e2e-test', ['code/api/app/Actions/Attendances/CheckIn.php', 'doc/x.md']);
  assert.equal(r.selection, 'none');
  assert.deepEqual(r.specs, []);
  assert.equal(r.specsEmpty, true);
});

test('[e2e-test] never falls back to targeted/full even when code changed', () => {
  const r = call('e2e-test', ['code/api/app/Services/Payroll/PayrollCalculator.php']);
  assert.equal(r.selection, 'none');
  assert.equal(r.specsEmpty, true);
});

// ---- [wip] -----------------------------------------------------------------

test('[wip] unions PR-changed specs with impact-mapped specs', () => {
  const r = call('wip', [
    'code/webapp/cypress/e2e/login.cy.ts',
    'code/api/app/Services/Payroll/PayrollCalculator.php',
  ]);
  assert.equal(r.selection, 'targeted');
  assert.deepEqual(r.specs, [
    'code/webapp/cypress/e2e/login.cy.ts',
    'code/webapp/cypress/e2e/payroll-*.cy.ts',
  ]);
});

test('[wip] with a code change that no impact-map entry matches falls back to the full suite', () => {
  const r = call('wip', ['code/api/app/Services/WeeklySummaryService.php']);
  assert.equal(r.selection, 'full');
  assert.match(r.reason, /no impact-map entry/i);
});

test('[wip] with only a matched code change (no changed spec) still runs the mapped specs', () => {
  const r = call('wip', ['code/webapp/src/features/attendance/AttendanceCard.tsx']);
  assert.equal(r.selection, 'targeted');
  assert.deepEqual(r.specs, ['code/webapp/cypress/e2e/attendance-*.cy.ts']);
});

test('[wip] with no code change and no changed spec runs no E2E', () => {
  const r = call('wip', ['doc/conventions/ci/pipeline.md', '.github/workflows/ci.yml']);
  assert.equal(r.selection, 'none');
  assert.equal(r.specsEmpty, true);
});

test('[wip] selection is not limited to changed Cypress files (regression guard)', () => {
  const r = call('wip', ['code/api/app/Http/Controllers/Api/V1/Payroll/ClosePayrollController.php']);
  assert.notEqual(r.selection, 'none');
  assert.ok(r.specs.includes('code/webapp/cypress/e2e/payroll-*.cy.ts'));
});

// ---- final ---------------------------------------------------------------

test('final mode runs the full suite whenever anything E2E-relevant changed', () => {
  assert.equal(call('final', ['code/api/app/Models/Item.php']).selection, 'full');
  assert.equal(call('final', ['code/webapp/src/main.tsx']).selection, 'full');
  assert.equal(call('final', ['code/webapp/cypress/e2e/home.cy.ts']).selection, 'full');
});

test('final mode with only non-code changes runs no E2E', () => {
  const r = call('final', ['doc/x.md', 'README.md', '.github/workflows/ci.yml']);
  assert.equal(r.selection, 'none');
});

// ---- shared -------------------------------------------------------------

test('duplicate specs are de-duplicated and order is stable', () => {
  const r = call('wip', [
    'code/webapp/cypress/e2e/payroll-close-confirm.cy.ts',
    'code/api/app/Services/Payroll/PayrollCalculator.php',
  ]);
  // changed spec + mapped glob, no dupes
  assert.deepEqual(r.specs, [
    'code/webapp/cypress/e2e/payroll-close-confirm.cy.ts',
    'code/webapp/cypress/e2e/payroll-*.cy.ts',
  ]);
});

test('a missing or empty changedFiles list is handled as no change', () => {
  assert.equal(selectE2e({ mode: 'final', changedFiles: [], impactMap: IMPACT_MAP }).selection, 'none');
  assert.equal(selectE2e({ mode: 'wip', changedFiles: undefined, impactMap: IMPACT_MAP }).selection, 'none');
});

test('an unknown mode is treated as final (conservative)', () => {
  assert.equal(call('banana', ['code/api/app/Models/Item.php']).selection, 'full');
});

// ---- infra change (P1: CI/E2E infrastructure in change detection) -----------

test('infraChanged forces the full suite in [wip] even with no code/spec change', () => {
  const r = call('wip', ['docker/app/Dockerfile'], true);
  assert.equal(r.selection, 'full');
  assert.match(r.reason, /infra/i);
});

test('infraChanged forces the full suite in final even with no code/spec change', () => {
  const r = call('final', ['.github/workflows/_e2e-ci.yml'], true);
  assert.equal(r.selection, 'full');
  assert.match(r.reason, /infra/i);
});

test('infraChanged wins over a targeted [wip] selection', () => {
  const r = call('wip', ['code/api/app/Services/Payroll/PayrollCalculator.php'], true);
  assert.equal(r.selection, 'full');
});

test('infraChanged is ignored in [e2e-test] mode', () => {
  assert.equal(call('e2e-test', ['docker-compose.e2e.yml'], true).selection, 'none');
  assert.equal(
    call('e2e-test', ['code/webapp/cypress/e2e/login.cy.ts'], true).selection,
    'pr-specs',
  );
});

test('infra-only change with mode final and infraChanged=false still runs nothing', () => {
  // the workflow decides infraChanged; when it says false, a non-code path is not E2E-relevant
  assert.equal(call('final', ['.github/workflows/_e2e-ci.yml'], false).selection, 'none');
});

// ---- P2: fall back when ANY changed code file is unmapped -------------------

test('[wip] with a mapped change AND an unrelated unmapped code change runs the full suite', () => {
  const r = call('wip', [
    'code/api/app/Services/Payroll/PayrollCalculator.php', // mapped
    'code/api/app/Services/BrandNewArea/Thing.php', // unmapped
  ]);
  assert.equal(r.selection, 'full');
  assert.match(r.reason, /match no impact-map entry/i);
});

test('[wip] with every changed code file mapped stays targeted', () => {
  const r = call('wip', [
    'code/api/app/Services/Payroll/PayrollCalculator.php',
    'code/webapp/src/features/attendance/AttendanceCard.tsx',
  ]);
  assert.equal(r.selection, 'targeted');
  assert.deepEqual(r.specs, [
    'code/webapp/cypress/e2e/payroll-*.cy.ts',
    'code/webapp/cypress/e2e/attendance-*.cy.ts',
  ]);
});

test('a changed .cy.ts is never counted as an unmapped code file', () => {
  const r = call('wip', [
    'code/webapp/cypress/e2e/brand-new-flow.cy.ts', // not in any map entry, but it IS a spec
  ]);
  assert.equal(r.selection, 'targeted');
  assert.deepEqual(r.specs, ['code/webapp/cypress/e2e/brand-new-flow.cy.ts']);
});

// ---- `includes` — transitive, full, cycle-safe -----------------------------

const INCLUDES_MAP = {
  entries: [
    { area: 'a', when: ['code/api/a/**'], run: ['code/webapp/cypress/e2e/a1.cy.ts'], includes: ['b'] },
    { area: 'b', when: ['code/api/b/**'], run: ['code/webapp/cypress/e2e/b1.cy.ts', 'code/webapp/cypress/e2e/b2.cy.ts'], includes: ['c'] },
    { area: 'c', when: ['code/api/c/**'], run: ['code/webapp/cypress/e2e/c1.cy.ts'], includes: ['a'] }, // cycle back to a
    { area: 'd', when: ['code/api/d/**'], run: ['code/webapp/cypress/e2e/d1.cy.ts'], includes: ['missing-area'] },
  ],
};

test('`includes` pulls in every included area\'s full run, transitively', () => {
  const r = selectE2e({ mode: 'wip', changedFiles: ['code/api/a/X.php'], impactMap: INCLUDES_MAP });
  assert.equal(r.selection, 'targeted');
  assert.deepEqual(r.specs.sort(), [
    'code/webapp/cypress/e2e/a1.cy.ts',
    'code/webapp/cypress/e2e/b1.cy.ts',
    'code/webapp/cypress/e2e/b2.cy.ts',
    'code/webapp/cypress/e2e/c1.cy.ts',
  ].sort());
});

test('`includes` cycles terminate (a -> b -> c -> a)', () => {
  const r = selectE2e({ mode: 'wip', changedFiles: ['code/api/c/X.php'], impactMap: INCLUDES_MAP });
  assert.deepEqual(r.specs.sort(), [
    'code/webapp/cypress/e2e/a1.cy.ts',
    'code/webapp/cypress/e2e/b1.cy.ts',
    'code/webapp/cypress/e2e/b2.cy.ts',
    'code/webapp/cypress/e2e/c1.cy.ts',
  ].sort());
});

test('an `includes` pointing at a non-existent area is ignored, not fatal', () => {
  const r = selectE2e({ mode: 'wip', changedFiles: ['code/api/d/X.php'], impactMap: INCLUDES_MAP });
  assert.deepEqual(r.specs, ['code/webapp/cypress/e2e/d1.cy.ts']);
});

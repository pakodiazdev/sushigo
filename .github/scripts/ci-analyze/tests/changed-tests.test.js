'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { apiTestFiles, webappTestFiles } = require('../changed-tests.js');

const FILES = [
  'code/api/app/Actions/Inventory/PostEntry.php',
  'code/api/tests/Feature/Inventory/PostEntryTest.php',
  'code/api/tests/Unit/Support/MoneyTest.php',
  'code/api/tests/Feature/helpers.php',
  'code/webapp/src/features/inventory/EntryForm.tsx',
  'code/webapp/src/features/inventory/__tests__/entry-form.test.tsx',
  'code/webapp/src/services/__tests__/inventory-api.test.ts',
  'code/webapp/cypress/e2e/inventory-entry.cy.ts',
  'code/webapp/src/routeTree.gen.ts',
  'doc/conventions/ci/pipeline.md',
];

test('apiTestFiles keeps only *Test.php under code/api/tests', () => {
  assert.deepEqual(apiTestFiles(FILES), [
    'code/api/tests/Feature/Inventory/PostEntryTest.php',
    'code/api/tests/Unit/Support/MoneyTest.php',
  ]);
});

test('webappTestFiles keeps only *.test.ts(x), excluding Cypress .cy.ts specs', () => {
  assert.deepEqual(webappTestFiles(FILES), [
    'code/webapp/src/features/inventory/__tests__/entry-form.test.tsx',
    'code/webapp/src/services/__tests__/inventory-api.test.ts',
  ]);
});

test('a non-test helper file under code/api/tests is not treated as a runnable test file', () => {
  assert.deepEqual(apiTestFiles(['code/api/tests/Feature/helpers.php']), []);
});

test('a spec/test file outside the surface root is ignored', () => {
  assert.deepEqual(apiTestFiles(['tests/FooTest.php', 'code/api/FooTest.php']), []);
  assert.deepEqual(webappTestFiles(['src/foo.test.ts']), []);
});

test('empty / non-array input yields an empty list, not a throw', () => {
  assert.deepEqual(apiTestFiles([]), []);
  assert.deepEqual(apiTestFiles(undefined), []);
  assert.deepEqual(webappTestFiles(null), []);
});

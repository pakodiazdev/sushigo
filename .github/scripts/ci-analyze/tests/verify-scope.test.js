'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { verifyNeeded } = require('../verify-scope.js');

test('nothing changed → no verification needed (documentation/config-only PR)', () => {
  assert.equal(verifyNeeded({ apiChanged: false, webappChanged: false, infraChanged: false, scriptsChanged: false }), false);
  assert.equal(verifyNeeded({ apiChanged: 'false', webappChanged: 'false', infraChanged: 'false', scriptsChanged: 'false' }), false);
  assert.equal(verifyNeeded({}), false);
  assert.equal(verifyNeeded(), false);
});

test('any single changed surface → verification needed', () => {
  assert.equal(verifyNeeded({ apiChanged: true }), true);
  assert.equal(verifyNeeded({ webappChanged: true }), true);
  assert.equal(verifyNeeded({ infraChanged: true }), true);
  assert.equal(verifyNeeded({ scriptsChanged: true }), true);
});

test('string "true" from dorny is treated as truthy', () => {
  assert.equal(verifyNeeded({ apiChanged: 'true' }), true);
  assert.equal(verifyNeeded({ scriptsChanged: 'true', webappChanged: 'false' }), true);
});

test('only a doc-shaped change set is false; a mixed set is true', () => {
  // e.g. changed: doc/x.md, README.md, .github/workflows/deploy-preview.yml → all four filters false
  assert.equal(verifyNeeded({ apiChanged: 'false', webappChanged: 'false', infraChanged: 'false', scriptsChanged: 'false' }), false);
  // doc change + a test-timing script tweak → scripts filter true
  assert.equal(verifyNeeded({ apiChanged: 'false', webappChanged: 'false', infraChanged: 'false', scriptsChanged: 'true' }), true);
});

test('non-boolean / non-"true" strings are falsy', () => {
  assert.equal(verifyNeeded({ apiChanged: '1', webappChanged: 'yes', infraChanged: null, scriptsChanged: undefined }), false);
});

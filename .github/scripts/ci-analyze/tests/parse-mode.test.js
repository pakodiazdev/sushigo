'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseMode } = require('../parse-mode.js');

test('a title with no state bracket is the final / merge-candidate mode', () => {
  assert.equal(parseMode('♻️ [#560][a] - Refactor PR CI into one visible DAG ♻️'), 'final');
  assert.equal(parseMode('[#123][b] - plain description'), 'final');
});

test('[wip] anywhere in the title selects wip mode', () => {
  assert.equal(parseMode('✨ [#123][a][wip] - Build the thing ✨'), 'wip');
  assert.equal(parseMode('[#123][a] - Build the thing [wip]'), 'wip');
});

test('[e2e-test] anywhere in the title selects the diagnostic mode', () => {
  assert.equal(parseMode('✨ [#123][a][e2e-test] - Fix a flaky spec ✨'), 'e2e-test');
  assert.equal(parseMode('[#123][c] - iterate on selectors [E2E-TEST]'), 'e2e-test');
});

test('mode tokens are case-insensitive and tolerate inner whitespace', () => {
  assert.equal(parseMode('[#1][a][ Wip ] - x'), 'wip');
  assert.equal(parseMode('[#1][a][ e2e-test ] - x'), 'e2e-test');
});

test('e2e-test wins when both [e2e-test] and [wip] are present (narrowest mode)', () => {
  assert.equal(parseMode('[#1][a][wip][e2e-test] - x'), 'e2e-test');
  assert.equal(parseMode('[#1][a][e2e-test][wip] - x'), 'e2e-test');
});

test('an empty, missing, or non-string title is final mode', () => {
  assert.equal(parseMode(''), 'final');
  assert.equal(parseMode(undefined), 'final');
  assert.equal(parseMode(null), 'final');
  assert.equal(parseMode(42), 'final');
});

test('substrings that are not their own bracket token do not trigger a mode', () => {
  // "wipe" contains "wip" but not as a [wip] token
  assert.equal(parseMode('[#1][a] - wipe down the counters'), 'final');
  assert.equal(parseMode('[#1][a] - end-to-end-test coverage'), 'final');
});

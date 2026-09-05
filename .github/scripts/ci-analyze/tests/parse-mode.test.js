'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseModifier, resolveCi } = require('../parse-mode.js');

// ---- parseModifier -------------------------------------------------------------

test('a title with no modifier bracket has no modifier', () => {
  assert.equal(parseModifier('✨ [#598][d] - Draft-based PR lifecycle ✨'), null);
  assert.equal(parseModifier('[#123][b] - plain description'), null);
});

test('[skip-ci] anywhere in the title is parsed', () => {
  assert.equal(parseModifier('✨ [#598][d][skip-ci] - scaffolding only ✨'), 'skip-ci');
  assert.equal(parseModifier('[#598][d] - docs [SKIP-CI]'), 'skip-ci');
});

test('[ci-check] and [ci-check-all] are distinct tokens', () => {
  assert.equal(parseModifier('[#1][a][ci-check] - x'), 'ci-check');
  assert.equal(parseModifier('[#1][a][ci-check-all] - x'), 'ci-check-all');
});

test('modifier tokens are case-insensitive and tolerate inner whitespace', () => {
  assert.equal(parseModifier('[#1][a][ Skip-CI ] - x'), 'skip-ci');
  assert.equal(parseModifier('[#1][a][ ci-check ] - x'), 'ci-check');
  assert.equal(parseModifier('[#1][a][ Ci-Check-All ] - x'), 'ci-check-all');
});

test('the narrowest modifier wins when several appear (skip-ci > ci-check > ci-check-all)', () => {
  assert.equal(parseModifier('[#1][a][ci-check][ci-check-all] - x'), 'ci-check');
  assert.equal(parseModifier('[#1][a][ci-check-all][ci-check] - x'), 'ci-check');
  assert.equal(parseModifier('[#1][a][skip-ci][ci-check-all] - x'), 'skip-ci');
  assert.equal(parseModifier('[#1][a][ci-check-all][skip-ci] - x'), 'skip-ci');
});

test('substrings that are not their own bracket token do not trigger a modifier', () => {
  assert.equal(parseModifier('[#1][a] - skip ci for now (manually)'), null);
  assert.equal(parseModifier('[#1][a] - add a ci-check helper'), null);
});

test('an empty, missing, or non-string title has no modifier', () => {
  assert.equal(parseModifier(''), null);
  assert.equal(parseModifier(undefined), null);
  assert.equal(parseModifier(null), null);
  assert.equal(parseModifier(42), null);
});

// ---- resolveCi: non-pull_request events -------------------------------------

test('a push (or any non-pull_request event) is always a full, gated run', () => {
  const r = resolveCi({ title: '', isDraft: false, eventName: 'push' });
  assert.deepEqual(r, {
    modifier: null,
    isDraft: false,
    runLint: true,
    testScope: 'full',
    e2eIntent: 'full',
    ciGate: 'evaluate',
    shallowOnReady: false,
  });
});

// ---- resolveCi: draft PRs -------------------------------------------------------

test('a draft PR with no modifier runs the changed-only scope and skips ci-gate', () => {
  const r = resolveCi({ title: '✨ [#598][d] - x ✨', isDraft: true, eventName: 'pull_request' });
  assert.equal(r.testScope, 'changed');
  assert.equal(r.e2eIntent, 'pr-specs');
  assert.equal(r.runLint, true);
  assert.equal(r.ciGate, 'skip');
  assert.equal(r.shallowOnReady, false);
});

test('a draft PR accepts the boolean-string form of isDraft', () => {
  const r = resolveCi({ title: '[#1][a] - x', isDraft: 'true', eventName: 'pull_request' });
  assert.equal(r.isDraft, true);
  assert.equal(r.ciGate, 'skip');
});

test('[ci-check-all] on a draft forces the full surface suites + full Cypress', () => {
  const r = resolveCi({ title: '[#1][a][ci-check-all] - x', isDraft: true, eventName: 'pull_request' });
  assert.equal(r.testScope, 'full');
  assert.equal(r.e2eIntent, 'full');
  assert.equal(r.ciGate, 'skip');
  assert.equal(r.shallowOnReady, false);
});

test('a draft infra-only change with no modifier is forced to full scope (pipeline exercised)', () => {
  const r = resolveCi({
    title: '🔧 [#598][d] - ci.yml rework 🚦',
    isDraft: true,
    eventName: 'pull_request',
    infraChanged: 'true',
  });
  assert.equal(r.testScope, 'full');
  assert.equal(r.e2eIntent, 'full');
  assert.equal(r.ciGate, 'skip'); // still a draft — merge still blocked
  assert.equal(r.shallowOnReady, false);
});

test('an explicit [ci-check] / [skip-ci] still opts a draft infra change out of the full run', () => {
  const ciCheck = resolveCi({ title: '[#1][d][ci-check] - x', isDraft: true, eventName: 'pull_request', infraChanged: 'true' });
  assert.equal(ciCheck.testScope, 'changed');
  const skip = resolveCi({ title: '[#1][d][skip-ci] - x', isDraft: true, eventName: 'pull_request', infraChanged: 'true' });
  assert.equal(skip.testScope, 'none');
});

test('infraChanged does not change a non-draft (ready) run — it is full either way', () => {
  const r = resolveCi({ title: '[#1][d] - x', isDraft: false, eventName: 'pull_request', infraChanged: 'true' });
  assert.equal(r.testScope, 'full');
  assert.equal(r.shallowOnReady, false);
});

test('infraChanged accepts the boolean-string form and is falsy when absent', () => {
  assert.equal(resolveCi({ title: '[#1][d] - x', isDraft: true, eventName: 'pull_request', infraChanged: true }).testScope, 'full');
  assert.equal(resolveCi({ title: '[#1][d] - x', isDraft: true, eventName: 'pull_request' }).testScope, 'changed');
  assert.equal(resolveCi({ title: '[#1][d] - x', isDraft: true, eventName: 'pull_request', infraChanged: 'false' }).testScope, 'changed');
});

test('[skip-ci] runs nothing — not even lint — in draft or ready', () => {
  const draft = resolveCi({ title: '[#1][a][skip-ci] - x', isDraft: true, eventName: 'pull_request' });
  assert.equal(draft.testScope, 'none');
  assert.equal(draft.e2eIntent, 'none');
  assert.equal(draft.runLint, false);

  const ready = resolveCi({ title: '[#1][a][skip-ci] - x', isDraft: false, eventName: 'pull_request' });
  assert.equal(ready.testScope, 'none');
  assert.equal(ready.runLint, false);
});

// ---- resolveCi: ready PRs ----------------------------------------------------

test('a ready PR with no modifier runs the full regression and is gated', () => {
  const r = resolveCi({ title: '✨ [#598][d] - x ✨', isDraft: false, eventName: 'pull_request' });
  assert.equal(r.testScope, 'full');
  assert.equal(r.e2eIntent, 'full');
  assert.equal(r.ciGate, 'evaluate');
  assert.equal(r.shallowOnReady, false);
});

test('a ready PR still carrying [skip-ci] is a shallow run — ci-gate must go red', () => {
  const r = resolveCi({ title: '[#1][a][skip-ci] - x', isDraft: false, eventName: 'pull_request' });
  assert.equal(r.ciGate, 'evaluate');
  assert.equal(r.shallowOnReady, true);
  assert.equal(r.modifier, 'skip-ci');
});

test('a ready PR still carrying [ci-check] is a shallow run — ci-gate must go red', () => {
  const r = resolveCi({ title: '[#1][a][ci-check] - x', isDraft: false, eventName: 'pull_request' });
  assert.equal(r.testScope, 'changed');
  assert.equal(r.ciGate, 'evaluate');
  assert.equal(r.shallowOnReady, true);
});

test('a ready PR with [ci-check-all] is a full run — not shallow', () => {
  const r = resolveCi({ title: '[#1][a][ci-check-all] - x', isDraft: false, eventName: 'pull_request' });
  assert.equal(r.testScope, 'full');
  assert.equal(r.shallowOnReady, false);
  assert.equal(r.ciGate, 'evaluate');
});

test('a draft PR never sets shallowOnReady, whatever the modifier', () => {
  for (const title of ['[#1][a] - x', '[#1][a][skip-ci] - x', '[#1][a][ci-check] - x']) {
    assert.equal(resolveCi({ title, isDraft: true, eventName: 'pull_request' }).shallowOnReady, false);
  }
});

test('an absent args object does not throw and is treated as a full gated run', () => {
  const r = resolveCi();
  assert.equal(r.testScope, 'full');
  assert.equal(r.ciGate, 'evaluate');
});

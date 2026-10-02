'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { evaluate, gatherFacts, WATERMARK_TAG, QUIESCE_TAG } = require('../guard.js');

const A = 'a'.repeat(40);
const B = 'b'.repeat(40);

const facts = (over = {}) => ({
  candidate: B,
  watermark: A,
  quiesced: false,
  onMain: true,
  descendsFromWatermark: true,
  ...over,
});

test('a strict descendant of the watermark on main is allowed', () => {
  assert.deepEqual(evaluate(facts()), { ok: true, bootstrap: false, watermark: A, reason: null });
});

test('no watermark yet is the explicit bootstrap case', () => {
  const r = evaluate(facts({ watermark: null, descendsFromWatermark: false }));
  assert.equal(r.ok, true);
  assert.equal(r.bootstrap, true);
});

test('a quiesced queue rejects every promotion, even a valid descendant', () => {
  const r = evaluate(facts({ quiesced: true }));
  assert.equal(r.ok, false);
  assert.match(r.reason, /quiesced/);
});

test('a commit that is not on main is rejected', () => {
  const r = evaluate(facts({ onMain: false }));
  assert.equal(r.ok, false);
  assert.match(r.reason, /not reachable from main/);
});

test('a commit older than or diverged from the watermark is rejected as stale', () => {
  const r = evaluate(facts({ descendsFromWatermark: false }));
  assert.equal(r.ok, false);
  assert.match(r.reason, /not a descendant/);
});

test('re-promoting the watermark commit itself is rejected (TD-07: rolled-back C must stay rejected)', () => {
  const r = evaluate(facts({ candidate: A, descendsFromWatermark: true }));
  assert.equal(r.ok, false);
  assert.match(r.reason, /already/);
});

test('an invalid candidate SHA is rejected before anything else', () => {
  const r = evaluate(facts({ candidate: 'main' }));
  assert.equal(r.ok, false);
  assert.match(r.reason, /full 40-character/);
});

// --- gatherFacts against real git repositories (a bare "origin" plus a clone) --------------------

function sh(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } }).trim();
}

function setup() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-'));
  const origin = path.join(root, 'origin.git');
  const work = path.join(root, 'work');
  sh(root, 'init', '--bare', '-b', 'main', origin);
  sh(root, 'clone', '-q', origin, work);
  sh(work, 'config', 'user.email', 't@example.com');
  sh(work, 'config', 'user.name', 't');
  const commit = (msg) => {
    sh(work, 'commit', '-q', '--allow-empty', '-m', msg);
    return sh(work, 'rev-parse', 'HEAD');
  };
  return { root, origin, work, commit };
}

test('gatherFacts reads watermark/quiesce tags from the remote and checks ancestry', () => {
  const { work, commit } = setup();
  const c1 = commit('c1');
  const c2 = commit('c2');
  sh(work, 'push', '-q', 'origin', 'main');

  let f = gatherFacts(c2, { cwd: work });
  assert.equal(f.watermark, null);
  assert.equal(f.quiesced, false);
  assert.equal(f.onMain, true);

  sh(work, 'push', '-q', 'origin', `${c1}:refs/tags/${WATERMARK_TAG}`);
  f = gatherFacts(c2, { cwd: work });
  assert.equal(f.watermark, c1);
  assert.equal(f.descendsFromWatermark, true);
  assert.equal(evaluate(f).ok, true);

  // Watermark moves ahead of the candidate → the older commit is stale.
  sh(work, 'push', '-q', '-f', 'origin', `${c2}:refs/tags/${WATERMARK_TAG}`);
  f = gatherFacts(c1, { cwd: work });
  assert.equal(f.descendsFromWatermark, false);
  assert.equal(evaluate(f).ok, false);

  // An annotated quiesce tag is detected and blocks promotion.
  const c3 = commit('c3');
  sh(work, 'push', '-q', 'origin', 'main');
  sh(work, 'tag', '-a', '-m', 'rolled back', QUIESCE_TAG, c2);
  sh(work, 'push', '-q', 'origin', `refs/tags/${QUIESCE_TAG}`);
  f = gatherFacts(c3, { cwd: work });
  assert.equal(f.quiesced, true);
  assert.equal(evaluate(f).ok, false);
});

test('gatherFacts dereferences an annotated watermark tag to its commit', () => {
  const { work, commit } = setup();
  const c1 = commit('c1');
  const c2 = commit('c2');
  sh(work, 'push', '-q', 'origin', 'main');
  sh(work, 'tag', '-a', '-m', 'wm', WATERMARK_TAG, c1);
  sh(work, 'push', '-q', 'origin', `refs/tags/${WATERMARK_TAG}`);
  const f = gatherFacts(c2, { cwd: work });
  assert.equal(f.watermark, c1);
  assert.equal(f.descendsFromWatermark, true);
});

test('gatherFacts reports a commit that exists only off main as not on main', () => {
  const { work, commit } = setup();
  commit('c1');
  sh(work, 'push', '-q', 'origin', 'main');
  sh(work, 'checkout', '-q', '-b', 'side');
  const side = commit('side');
  sh(work, 'push', '-q', 'origin', 'side');
  const f = gatherFacts(side, { cwd: work });
  assert.equal(f.onMain, false);
});

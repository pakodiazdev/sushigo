'use strict';

// Production promotion guard (#636, TD-07 "Anti-rollback guards").
//
// A `concurrency` group only guarantees mutual exclusion, not ordering, so this is what actually
// stops an older `main` commit's slower run from reverting Production to a stale release. It is run
// three times per promotion by deploy-production.yml: in preflight, again after the approval gate
// (which can wait for hours), and immediately before the traffic shift.
//
// State lives in two tags on the repository itself, read straight from the remote every time
// (never from a possibly-stale local tag):
//   deploy/production/watermark — the highest commit ever promoted to Production. Advanced only
//                                 after a successful traffic shift; never moved backward, so a
//                                 manual rollback does not re-open the rolled-back commit.
//   deploy/production/quiesced  — present while Production's promotion queue is suspended (a
//                                 failed release or a manual rollback). Removed only by a human,
//                                 via production-rollback.yml's `resume` action.
//
// Usage: node guard.js <candidate-sha>
// Writes watermark=<sha|> and bootstrap=true|false to $GITHUB_OUTPUT; exits 1 with the reason when
// the promotion must not proceed.

const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

const WATERMARK_TAG = 'deploy/production/watermark';
const QUIESCE_TAG = 'deploy/production/quiesced';
const SHA = /^[0-9a-f]{40}$/;

function evaluate({ candidate, watermark, quiesced, onMain, descendsFromWatermark }) {
  const reject = (reason) => ({ ok: false, bootstrap: false, watermark, reason });

  if (!SHA.test(candidate || '')) {
    return reject(`candidate '${candidate}' is not a full 40-character commit SHA`);
  }
  if (quiesced) {
    return reject(
      `Production's promotion queue is quiesced (tag ${QUIESCE_TAG} exists) after a failed release or a rollback. ` +
        'Investigate, then run the "Production rollback / resume" workflow with action=resume.',
    );
  }
  if (!onMain) {
    return reject(`${candidate} is not reachable from main — only commits merged to main can be promoted`);
  }
  if (watermark === null) {
    return { ok: true, bootstrap: true, watermark: null, reason: null };
  }
  if (candidate === watermark) {
    return reject(`${candidate} is already Production's watermark — a commit is never promoted twice`);
  }
  if (!descendsFromWatermark) {
    return reject(
      `${candidate} is not a descendant of Production's watermark ${watermark} — refusing to promote a stale release`,
    );
  }
  return { ok: true, bootstrap: false, watermark, reason: null };
}

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function gitOk(cwd, ...args) {
  try {
    git(cwd, ...args);
    return true;
  } catch {
    return false;
  }
}

// Resolves a tag on the remote to the commit it points at (peeling annotated tags), or null.
function remoteTagCommit(cwd, tag) {
  const out = git(cwd, 'ls-remote', 'origin', `refs/tags/${tag}`, `refs/tags/${tag}^{}`);
  if (out === '') return null;
  const rows = out.split('\n').map((l) => l.split('\t'));
  const peeled = rows.find(([, ref]) => ref.endsWith('^{}'));
  return (peeled || rows[0])[0];
}

function gatherFacts(candidate, { cwd = process.cwd(), mainBranch = 'main' } = {}) {
  git(cwd, 'fetch', '--quiet', 'origin', `+refs/heads/${mainBranch}:refs/remotes/origin/${mainBranch}`);
  const watermark = remoteTagCommit(cwd, WATERMARK_TAG);
  const quiesced = remoteTagCommit(cwd, QUIESCE_TAG) !== null;

  const onMain = SHA.test(candidate) && gitOk(cwd, 'merge-base', '--is-ancestor', candidate, `origin/${mainBranch}`);

  let descendsFromWatermark = false;
  if (watermark && onMain) {
    if (!gitOk(cwd, 'cat-file', '-e', `${watermark}^{commit}`)) {
      gitOk(cwd, 'fetch', '--quiet', 'origin', watermark);
    }
    descendsFromWatermark = gitOk(cwd, 'merge-base', '--is-ancestor', watermark, candidate);
  }

  return { candidate, watermark, quiesced, onMain, descendsFromWatermark };
}

function main() {
  const candidate = process.argv[2] || '';
  const result = evaluate(gatherFacts(candidate));
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(
      process.env.GITHUB_OUTPUT,
      `watermark=${result.watermark || ''}\nbootstrap=${result.bootstrap}\n`,
    );
  }
  if (!result.ok) {
    console.log(`::error title=Production promotion guard::${result.reason}`);
    process.exit(1);
  }
  console.log(
    result.bootstrap
      ? `✅ ${candidate}: no Production watermark yet — bootstrap release`
      : `✅ ${candidate} strictly descends from Production's watermark ${result.watermark}; queue not quiesced`,
  );
}

if (require.main === module) {
  main();
}

module.exports = { evaluate, gatherFacts, WATERMARK_TAG, QUIESCE_TAG };

'use strict';

// Parses the PR execution mode from a pull-request title (#560).
//
// The title convention (doc/conventions/git/pull-requests.md) is:
//   <emoji> [#NNN][x][<state>] - <description> <emoji>
// where the optional third bracket carries the state:
//   [e2e-test] -> Cypress-only diagnostic mode  (never a merge candidate)
//   [wip]      -> normal quality branches + targeted E2E (never a merge candidate)
//   (absent)   -> final / merge-candidate mode
//
// Only a whole bracket token counts: "wipe the counters" or "end-to-end-test" in a
// description must not flip the mode. Matching is case-insensitive and tolerates
// whitespace inside the bracket. If both [e2e-test] and [wip] appear, [e2e-test]
// wins — it is the narrowest mode (skips the most), so it is the safe resolution
// of a nonsensical combination.

const E2E_TEST_TOKEN = /\[\s*e2e-test\s*\]/i;
const WIP_TOKEN = /\[\s*wip\s*\]/i;

/**
 * @param {unknown} title raw PR title (`github.event.pull_request.title`)
 * @returns {'e2e-test' | 'wip' | 'final'}
 */
function parseMode(title) {
  if (typeof title !== 'string' || title.length === 0) {
    return 'final';
  }
  if (E2E_TEST_TOKEN.test(title)) {
    return 'e2e-test';
  }
  if (WIP_TOKEN.test(title)) {
    return 'wip';
  }
  return 'final';
}

module.exports = { parseMode };

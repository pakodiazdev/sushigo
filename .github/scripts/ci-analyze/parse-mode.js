'use strict';

// Resolves the PR CI execution model (#598) from the PR title's optional modifier
// bracket and the PR's native draft status.
//
// Merge-blocking is GitHub *draft* status now — there is no [wip] bracket. A draft
// PR cannot be merged natively, so `ci-gate` is skipped on drafts entirely (a
// skipped required check counts as passing, which is fine — the draft blocks the
// merge anyway).
//
// The title carries only an optional CI-cost modifier bracket, matched by content,
// case-insensitively, tolerating whitespace inside the bracket. Only a whole
// bracket token counts — "skip ci for now" in a description must not flip anything.
//
//   [skip-ci]      -> run nothing at all (not even lint / typecheck)
//   [ci-check]     -> lint/typecheck + only the test files this PR added/modified
//   [ci-check-all] -> lint/typecheck + the full suite of every touched surface + full Cypress
//   (absent)       -> draft => same as [ci-check]
//                     ready => same as [ci-check-all]
//
// If more than one modifier bracket appears, the NARROWEST wins (skips the most):
//   skip-ci > ci-check > ci-check-all — the safe resolution of a nonsensical combo,
//   mirroring the retired [e2e-test] > [wip] rule.
//
// A READY PR whose effective scope is not `full` (title still carries [skip-ci] or
// [ci-check]) is a shallow / suppressed run: `ci-gate` goes red with a "remove the
// modifier" message. That is the ONLY case a ci-gate red is not a real test failure.

const SKIP_CI_TOKEN = /\[\s*skip-ci\s*\]/i;
const CI_CHECK_TOKEN = /\[\s*ci-check\s*\]/i;
const CI_CHECK_ALL_TOKEN = /\[\s*ci-check-all\s*\]/i;

/**
 * The raw CI-cost modifier in the title (narrowest wins).
 * @param {unknown} title raw PR title (`github.event.pull_request.title`)
 * @returns {'skip-ci' | 'ci-check' | 'ci-check-all' | null}
 */
function parseModifier(title) {
  if (typeof title !== 'string' || title.length === 0) {
    return null;
  }
  if (SKIP_CI_TOKEN.test(title)) {
    return 'skip-ci';
  }
  // `CI_CHECK_TOKEN` cannot match inside "[ci-check-all]" (the trailing "-all]"
  // breaks the "\s*\]"), so testing it first also yields narrowest-wins when both
  // [ci-check] and [ci-check-all] are present.
  if (CI_CHECK_TOKEN.test(title)) {
    return 'ci-check';
  }
  if (CI_CHECK_ALL_TOKEN.test(title)) {
    return 'ci-check-all';
  }
  return null;
}

function isTrue(value) {
  return value === true || value === 'true';
}

/**
 * @param {object}  [args]
 * @param {unknown} [args.title]        github.event.pull_request.title
 * @param {unknown} [args.isDraft]      github.event.pull_request.draft
 * @param {unknown} [args.eventName]    github.event_name
 * @param {unknown} [args.infraChanged] analyze-pr's `infra` paths-filter output — pipeline
 *                                      infra (ci.yml, the reusable workflows, ci-analyze,
 *                                      docker) changed
 * @returns {{
 *   modifier: 'skip-ci' | 'ci-check' | 'ci-check-all' | null,
 *   isDraft: boolean,
 *   runLint: boolean,
 *   testScope: 'none' | 'changed' | 'full',
 *   e2eIntent: 'none' | 'pr-specs' | 'full',
 *   ciGate: 'skip' | 'evaluate',
 *   shallowOnReady: boolean,
 * }}
 */
function resolveCi({ title, isDraft, eventName, infraChanged } = {}) {
  // Only pull_request events carry the draft/title model. push to main,
  // workflow_dispatch, … are always a full, gated run.
  if (eventName !== 'pull_request') {
    return {
      modifier: null,
      isDraft: false,
      runLint: true,
      testScope: 'full',
      e2eIntent: 'full',
      ciGate: 'evaluate',
      shallowOnReady: false,
    };
  }

  const draft = isTrue(isDraft);
  const infra = isTrue(infraChanged);
  const modifier = parseModifier(title);

  let testScope;
  if (modifier === 'skip-ci') {
    testScope = 'none';
  } else if (modifier === 'ci-check') {
    testScope = 'changed';
  } else if (modifier === 'ci-check-all') {
    testScope = 'full';
  } else if (!draft) {
    testScope = 'full';
  } else {
    // Draft, no modifier: normally the cheap [ci-check] scope — EXCEPT when the PR
    // changes pipeline infra itself. A shallow run then hands empty file lists to the
    // reusable workflows and skips Cypress/Sonar, giving false confidence in the very
    // config that will govern `main`. Force `full` so the changed pipeline is actually
    // exercised. An explicit [skip-ci] / [ci-check] modifier still opts out.
    testScope = infra ? 'full' : 'changed';
  }

  const runLint = modifier !== 'skip-ci';
  let e2eIntent;
  if (testScope === 'none') {
    e2eIntent = 'none';
  } else if (testScope === 'full') {
    e2eIntent = 'full';
  } else {
    e2eIntent = 'pr-specs';
  }

  const ciGate = draft ? 'skip' : 'evaluate';
  const shallowOnReady = !draft && testScope !== 'full';

  return { modifier, isDraft: draft, runLint, testScope, e2eIntent, ciGate, shallowOnReady };
}

module.exports = { parseModifier, resolveCi };

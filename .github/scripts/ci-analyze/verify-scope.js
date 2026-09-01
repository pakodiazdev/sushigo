'use strict';

// Given the coarse change-surface booleans from analyze-pr's dorny filter, decide whether
// this PR needs the verification arsenal at all (#560).
//
//   true  -> at least one code / test / pipeline / script file changed; run the DAG.
//   false -> a documentation or non-pipeline-config-only change (only doc/**, *.md, LICENSE,
//            an operational workflow like deploy-preview.yml, etc.). ci-gate short-circuits
//            this to a fast green in final mode instead of sending api-ci / webapp-ci / e2e-ci
//            off to verify nothing.

function isTrue(value) {
  return value === true || value === 'true';
}

/**
 * @param {object} surfaces
 * @param {boolean|string} surfaces.apiChanged      code/api/**
 * @param {boolean|string} surfaces.webappChanged   code/webapp/** (Cypress specs included)
 * @param {boolean|string} surfaces.infraChanged    docker/**, ci.yml, the reusable workflows, ci-analyze, the impact map
 * @param {boolean|string} surfaces.scriptsChanged  .github/scripts/**
 * @returns {boolean}
 */
function verifyNeeded({ apiChanged, webappChanged, infraChanged, scriptsChanged } = {}) {
  return (
    isTrue(apiChanged) ||
    isTrue(webappChanged) ||
    isTrue(infraChanged) ||
    isTrue(scriptsChanged)
  );
}

module.exports = { verifyNeeded };

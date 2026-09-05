'use strict';

// Decides which Cypress specs a PR CI run should execute (#598), given the
// effective E2E intent (from parse-mode.js's `resolveCi().e2eIntent`) and the
// files the PR changed.
//
// Return shape:
//   {
//     selection: 'none' | 'pr-specs' | 'full',
//     specs:     string[]  // repo-relative spec paths (empty for 'none' / 'full')
//     specsEmpty: boolean  // true when nothing will run
//     reason:    string    // human-readable, surfaced on the job summary
//   }
//
// Intent semantics:
//   'none'      ([skip-ci], or nothing E2E-relevant) -> run no Cypress.
//   'pr-specs'  (draft default / [ci-check])         -> ONLY the .cy.ts files this PR
//               added/modified. Zero changed specs => 'none' (NOT a failure — the
//               retired [e2e-test] empty-guard is gone).
//   'full'      (ready default / [ci-check-all])     -> the entire suite, whenever any
//               code file, any changed spec, or pipeline/E2E infra changed; else 'none'.
//   unknown     -> treated as 'full' (conservative).
//
// `infraChanged` is supplied by the workflow (its own dorny `infra` filter over
// docker-compose*.yml, docker/**, the reusable workflows and
// .github/scripts/ci-analyze/**). A change there can alter any Cypress flow without
// touching a code/** file or a .cy.ts, so it forces the full suite for a 'full' run.

const SPEC_GLOB = 'code/webapp/cypress/e2e/**/*.cy.ts';
const CODE_PREFIXES = ['code/api/', 'code/webapp/'];

function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i += 1) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        // '**' matches any number of path segments (including none)
        re += '.*';
        i += 1;
        if (glob[i + 1] === '/') {
          i += 1;
        }
      } else {
        // '*' matches within a single path segment
        re += '[^/]*';
      }
    } else if ('\\^$+?.()|{}[]'.includes(c)) {
      re += `\\${c}`;
    } else {
      re += c;
    }
  }
  return new RegExp(`^${re}$`);
}

function isSpec(filePath) {
  return globToRegExp(SPEC_GLOB).test(filePath);
}

function isCode(filePath) {
  return CODE_PREFIXES.some((prefix) => filePath.startsWith(prefix));
}

function uniqueStable(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    if (!seen.has(item)) {
      seen.add(item);
      out.push(item);
    }
  }
  return out;
}

/**
 * @param {object}   args
 * @param {string}   args.mode           'none' | 'pr-specs' | 'full' (anything else => 'full')
 * @param {string[]} args.changedFiles   repo-relative paths added/modified/renamed by the PR
 * @param {boolean}  args.infraChanged   pipeline/E2E infra files changed (workflow's `infra` filter)
 */
function selectE2e({ mode, changedFiles, infraChanged = false }) {
  const files = Array.isArray(changedFiles) ? changedFiles : [];
  const prSpecs = uniqueStable(files.filter(isSpec));
  const codeChanged = files.some(isCode);
  const infra = infraChanged === true || infraChanged === 'true';

  const none = (reason) => ({ selection: 'none', specs: [], specsEmpty: true, reason });

  if (mode === 'none') {
    return none('no Cypress this run (skip-ci, or nothing E2E-relevant changed)');
  }

  if (mode === 'pr-specs') {
    if (prSpecs.length === 0) {
      return none('draft / [ci-check]: the PR added/modified no Cypress spec — nothing to run');
    }
    return {
      selection: 'pr-specs',
      specs: prSpecs,
      specsEmpty: false,
      reason: `draft / [ci-check]: running the ${prSpecs.length} Cypress spec(s) this PR changed`,
    };
  }

  // 'full' (ready default / [ci-check-all]) and any unknown value (conservative).
  if (!codeChanged && prSpecs.length === 0 && !infra) {
    return none('full run: nothing E2E-relevant changed');
  }
  return {
    selection: 'full',
    specs: [],
    specsEmpty: false,
    reason: infra
      ? 'full run: pipeline/E2E infra changed — running the full Cypress suite'
      : 'full run: running the full Cypress suite',
  };
}

module.exports = { selectE2e, globToRegExp };

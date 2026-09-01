'use strict';

// Decides which Cypress specs a PR CI run should execute, given the execution mode
// (#560), the files the PR changed, and the functional-impact map
// (.github/e2e-impact-map.json).
//
// Return shape:
//   {
//     selection: 'none' | 'pr-specs' | 'targeted' | 'full',
//     specs:     string[]  // repo-relative spec paths and/or impact-map globs
//     specsEmpty: boolean  // true when nothing will run
//     reason:    string    // human-readable, surfaced on the job summary
//   }
//
// Selection semantics (see the issue's "E2E selection semantics" section):
//   [e2e-test]  -> ONLY the specs the PR added/modified; empty => 'none' (caller fails loudly).
//                  Never falls back to targeted/full. Ignores `infraChanged`.
//   [wip]       -> PR-changed specs  +  specs mapped from impacted functional areas.
//                  Any changed code file that no map entry covers => 'full' (conservative).
//                  Pipeline/E2E infra changed => 'full'.
//                  Nothing E2E-relevant changed => 'none'.
//   final       -> 'full' whenever any code file, any changed spec, or pipeline/E2E infra
//                  changed, else 'none'.
//   unknown     -> treated as final.
//
// `infraChanged` is supplied by the workflow (its own dorny `infra` filter over
// docker-compose*.yml, docker/**, the reusable workflows and .github/scripts/ci-analyze/**,
// .github/e2e-impact-map.json). A change there can alter any Cypress flow without touching a
// code/** file or a .cy.ts, so it forces the full suite in [wip]/final — the legacy
// cypress-e2e.yml treated the same Docker paths as E2E-relevant.

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

function matchesAnyGlob(filePath, globs) {
  return globs.some((glob) => globToRegExp(glob).test(filePath));
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

// Every spec glob an entry contributes: its own `run`, plus (transitively) the `run` of every
// area named in its optional `includes` list. `includes` lets an area whose model is a
// dependency of another domain (e.g. `employees` -> `attendance`, `payroll`) pull that domain's
// FULL current spec set without copying — and re-copying — a subset that drifts out of date.
function resolveEntryRun(entry, byArea, seen) {
  if (!entry || seen.has(entry.area)) {
    return [];
  }
  seen.add(entry.area);
  const out = [...(Array.isArray(entry.run) ? entry.run : [])];
  for (const includedArea of (Array.isArray(entry.includes) ? entry.includes : [])) {
    out.push(...resolveEntryRun(byArea.get(includedArea), byArea, seen));
  }
  return out;
}

function mappedSpecs(changedFiles, impactMap) {
  const entries = (impactMap && Array.isArray(impactMap.entries)) ? impactMap.entries : [];
  const byArea = new Map(entries.map((entry) => [entry.area, entry]));
  const out = [];
  for (const entry of entries) {
    const when = Array.isArray(entry.when) ? entry.when : [];
    if (changedFiles.some((file) => matchesAnyGlob(file, when))) {
      out.push(...resolveEntryRun(entry, byArea, new Set()));
    }
  }
  return uniqueStable(out);
}

// A changed non-spec code file is "covered" when at least one impact-map entry's `when` globs
// match it. Changed .cy.ts specs are excluded — they're already carried in `prSpecs`.
function unmappedCodeFiles(changedFiles, impactMap) {
  const entries = (impactMap && Array.isArray(impactMap.entries)) ? impactMap.entries : [];
  const allWhen = entries.flatMap((entry) => (Array.isArray(entry.when) ? entry.when : []));
  return changedFiles.filter(
    (file) => isCode(file) && !isSpec(file) && !matchesAnyGlob(file, allWhen),
  );
}

/**
 * @param {object}   args
 * @param {string}   args.mode           'e2e-test' | 'wip' | 'final' (anything else => final)
 * @param {string[]} args.changedFiles   repo-relative paths added/modified/renamed by the PR
 * @param {object}   args.impactMap      parsed .github/e2e-impact-map.json ({ entries: [...] })
 * @param {boolean}  args.infraChanged   pipeline/E2E infra files changed (workflow's `infra` filter)
 */
function selectE2e({ mode, changedFiles, impactMap, infraChanged = false }) {
  const files = Array.isArray(changedFiles) ? changedFiles : [];
  const prSpecs = files.filter(isSpec);
  const codeChanged = files.some(isCode);
  const infra = infraChanged === true || infraChanged === 'true';

  const none = (reason) => ({ selection: 'none', specs: [], specsEmpty: true, reason });
  const fullSuite = (reason) => ({ selection: 'full', specs: [], specsEmpty: false, reason });

  if (mode === 'e2e-test') {
    if (prSpecs.length === 0) {
      return none('[e2e-test] mode: the PR added/modified no Cypress spec — nothing to run');
    }
    return {
      selection: 'pr-specs',
      specs: uniqueStable(prSpecs),
      specsEmpty: false,
      reason: `[e2e-test] mode: running the ${prSpecs.length} Cypress spec(s) this PR changed`,
    };
  }

  if (mode === 'wip') {
    if (!codeChanged && prSpecs.length === 0 && !infra) {
      return none('[wip] mode: nothing E2E-relevant changed');
    }
    if (infra) {
      return fullSuite('[wip] mode: pipeline/E2E infra changed — running the full suite');
    }
    const unmapped = unmappedCodeFiles(files, impactMap);
    if (unmapped.length > 0) {
      return fullSuite(
        `[wip] mode: ${unmapped.length} changed code file(s) match no impact-map entry — running the full suite (conservative fallback)`,
      );
    }
    return {
      selection: 'targeted',
      specs: uniqueStable([...prSpecs, ...mappedSpecs(files, impactMap)]),
      specsEmpty: false,
      reason: '[wip] mode: running PR-changed specs plus impact-mapped specs',
    };
  }

  // final (and any unknown mode)
  if (!codeChanged && prSpecs.length === 0 && !infra) {
    return none('final mode: nothing E2E-relevant changed');
  }
  return fullSuite(
    infra
      ? 'final mode: pipeline/E2E infra changed — running the full Cypress suite'
      : 'final mode: running the full Cypress suite',
  );
}

module.exports = { selectE2e, globToRegExp };

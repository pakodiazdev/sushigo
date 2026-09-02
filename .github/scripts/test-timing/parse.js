'use strict';

// PHPUnit's --log-junit output nests <testsuite> elements (root -> Unit/Feature -> per-class)
// with leaf <testcase> elements carrying the actual per-test duration. A <testcase> is
// self-closing unless the test failed/errored, in which case it wraps a <failure>/<error> child
// instead — both forms are matched here.
//
// One combined token regex walks <testsuite> / </testsuite> / <testcase> in document order so
// each testcase can be attributed to a spec file: its own `file=` if present, else the `file=`
// of the nearest still-open ancestor <testsuite> (Cypress' mocha-junit-reporter puts the
// `.cy.ts` path on the per-describe <testsuite>, not on every <testcase>).
const TOKEN_RE =
  /<testsuite\b([^>]*?)(\/?)>|<\/testsuite>|<testcase\b([^>]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/g;
const ATTR_RE = /([\w-]+)="([^"]*)"/g;
// Suite-wide `tests`/`time` totals live in different places by reporter:
//   PHPUnit  --log-junit  → bare <testsuites>, totals on the first inner <testsuite>
//   Cypress  mocha-junit-reporter → totals on <testsuites>, with a zeroed
//                                   <testsuite name="Root Suite" tests="0" time="0"> right after
// So read <testsuites> first and only fall back to the first <testsuite> when the plural
// wrapper carries no totals of its own. \b stops <testsuite\b from matching "<testsuites".
const ROOT_SUITES_RE = /<testsuites\b([^>]*?)>/;
const ROOT_SUITE_RE = /<testsuite\b([^>]*?)>/;

function parseAttributes(attrString) {
  const attrs = {};
  let match;
  ATTR_RE.lastIndex = 0;
  while ((match = ATTR_RE.exec(attrString)) !== null) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}

function nearestSuiteFile(suiteFileStack) {
  for (let i = suiteFileStack.length - 1; i >= 0; i -= 1) {
    if (suiteFileStack[i]) {
      return suiteFileStack[i];
    }
  }
  return null;
}

function parseJunitXml(xml) {
  const testcases = [];
  const suiteFileStack = [];
  let match;
  TOKEN_RE.lastIndex = 0;
  while ((match = TOKEN_RE.exec(xml)) !== null) {
    const token = match[0];
    if (token.startsWith('</testsuite')) {
      suiteFileStack.pop();
      continue;
    }
    if (token.startsWith('<testsuite')) {
      const attrs = parseAttributes(match[1]);
      const selfClosing = match[2] === '/';
      if (!selfClosing) {
        suiteFileStack.push(attrs.file ?? null);
      }
      continue;
    }
    const attrs = parseAttributes(match[3]);
    const ownFile = attrs.file ?? null;
    testcases.push({
      name: attrs.name ?? '(unknown)',
      class: attrs.class ?? attrs.classname ?? '(unknown)',
      file: ownFile,
      line: attrs.line ? Number(attrs.line) : null,
      time: attrs.time ? Number(attrs.time) : 0,
      specFile: ownFile ?? nearestSuiteFile(suiteFileStack),
    });
  }

  // Prefer <testsuites> (Cypress carries totals there); fall back to the first <testsuite>
  // (PHPUnit's bare <testsuites> has none). Presence is checked with `in`, not truthiness —
  // a real `time="0"` / `tests="0"` on the chosen root must be honoured, while a missing
  // attribute falls back to the summed duration / leaf count.
  const suitesMatch = ROOT_SUITES_RE.exec(xml);
  const suitesAttrs = suitesMatch ? parseAttributes(suitesMatch[1]) : {};
  const rootAttrs =
    'tests' in suitesAttrs || 'time' in suitesAttrs
      ? suitesAttrs
      : (() => {
          const suiteMatch = ROOT_SUITE_RE.exec(xml);
          return suiteMatch ? parseAttributes(suiteMatch[1]) : {};
        })();

  const summedTime = testcases.reduce((sum, testcase) => sum + testcase.time, 0);

  return {
    testcases,
    suiteTime: 'time' in rootAttrs ? Number(rootAttrs.time) : summedTime,
    totalTests: 'tests' in rootAttrs ? Number(rootAttrs.tests) : testcases.length,
  };
}

// Combines the per-shard reports produced by api-tests.yml's `matrix.shard` strategy (#481) into
// a single whole-suite view — same shape `parseJunitXml` returns for one file — so the Top-N
// summary reflects the entire test run instead of just one shard's partial data.
function mergeParsed(parsedReports) {
  return {
    testcases: parsedReports.flatMap((report) => report.testcases),
    suiteTime: parsedReports.reduce((sum, report) => sum + report.suiteTime, 0),
    totalTests: parsedReports.reduce((sum, report) => sum + report.totalTests, 0),
  };
}

module.exports = { parseJunitXml, mergeParsed };

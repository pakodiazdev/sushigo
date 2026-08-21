'use strict';

// PHPUnit's --log-junit output nests <testsuite> elements (root -> Unit/Feature -> per-class)
// with leaf <testcase> elements carrying the actual per-test duration. A <testcase> is
// self-closing unless the test failed/errored, in which case it wraps a <failure>/<error> child
// instead — both forms are matched here.
const TESTCASE_RE = /<testcase\b([^>]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/g;
const ATTR_RE = /([\w-]+)="([^"]*)"/g;
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

function parseJunitXml(xml) {
  const testcases = [];
  let match;
  TESTCASE_RE.lastIndex = 0;
  while ((match = TESTCASE_RE.exec(xml)) !== null) {
    const attrs = parseAttributes(match[1]);
    testcases.push({
      name: attrs.name ?? '(unknown)',
      class: attrs.class ?? attrs.classname ?? '(unknown)',
      file: attrs.file ?? null,
      line: attrs.line ? Number(attrs.line) : null,
      time: attrs.time ? Number(attrs.time) : 0,
    });
  }

  // The first <testsuite> in the document is always the root wrapper PHPUnit emits around
  // every top-level suite (see phpunit.xml's <testsuite name="Unit"|"Feature">), so it carries
  // the suite-wide `tests`/`time` totals.
  const rootMatch = ROOT_SUITE_RE.exec(xml);
  const rootAttrs = rootMatch ? parseAttributes(rootMatch[1]) : {};

  const summedTime = testcases.reduce((sum, testcase) => sum + testcase.time, 0);

  return {
    testcases,
    suiteTime: rootAttrs.time ? Number(rootAttrs.time) : summedTime,
    totalTests: rootAttrs.tests ? Number(rootAttrs.tests) : testcases.length,
  };
}

module.exports = { parseJunitXml };

'use strict';

// Issue #578: when an API shard fails on a database error, the *first* DB-level
// failure IN THAT SHARD is the root cause — typically a PostgreSQL SQLSTATE such
// as 23505 (unique_violation on `unique_stock_per_location`). Everything after it
// on the same connection is a secondary "current transaction is aborted" error
// (SQLSTATE 25P02).
//
// Shards run as independent processes against independent databases, and within
// a shard RefreshDatabase gives every test its own transaction — so no two
// separate test failures can be assumed to share a causal chain from the JUnit
// alone. This module therefore groups failures BY SHARD and, per shard, lists
// every DB failure in execution order with its SQLSTATE classified per row
// (concrete constraint/query error vs. 25P02 aborted-transaction). It points at
// the first concrete error as the most likely thing to check first, but makes
// no cross-test cascade claim and never attributes one shard's errors to
// another.

// A <testcase> is self-closing unless it failed/errored, in which case it wraps
// a <failure>/<error> child — the (?:\/>|>…</testcase>) alternation matches both
// forms so a passing self-closing case can never absorb the next case's body.
const TESTCASE_RE = /<testcase\b([^>]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/g;
const ATTR_RE = /([\w-]+)="([^"]*)"/g;
const FAILURE_RE = /<(failure|error)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/\1>)/;
const SQLSTATE_RE = /SQLSTATE\[([0-9A-Za-z]{5})\]/;

// "current transaction is aborted, commands ignored until end of transaction
// block" — a downstream symptom, never the root cause.
const ABORTED_TRANSACTION_SQLSTATE = '25P02';

function parseAttributes(attrString) {
  const attrs = {};
  let match;
  ATTR_RE.lastIndex = 0;
  while ((match = ATTR_RE.exec(attrString)) !== null) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}

function decodeEntities(value) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

// reports: Array<{ shard: string, xml: string }> — one entry per JUnit file.
// Returns every failed/errored test case that carries a SQLSTATE, tagged with
// the shard it came from, in document order (PHPUnit writes test cases in
// execution order within a shard).
function collectDatabaseFailures(reports) {
  const failures = [];

  for (const { shard, xml } of reports) {
    let match;
    TESTCASE_RE.lastIndex = 0;
    while ((match = TESTCASE_RE.exec(xml)) !== null) {
      const attrs = parseAttributes(match[1]);
      const body = match[2] ?? '';

      const failureMatch = FAILURE_RE.exec(body);
      if (failureMatch === null) {
        continue;
      }

      const detail = decodeEntities(
        `${failureMatch[2] ?? ''} ${failureMatch[3] ?? ''}`,
      );
      const sqlstateMatch = SQLSTATE_RE.exec(detail);
      if (sqlstateMatch === null) {
        continue;
      }

      const sqlstate = sqlstateMatch[1].toUpperCase();
      failures.push({
        shard,
        class: attrs.class ?? attrs.classname ?? '(unknown)',
        name: attrs.name ?? '(unknown)',
        sqlstate,
        secondary: sqlstate === ABORTED_TRANSACTION_SQLSTATE,
      });
    }
  }

  return failures;
}

// Cap the per-shard row list so a shard with dozens of failures doesn't flood
// the job summary.
const MAX_ROWS_PER_SHARD = 15;

function buildDatabaseFailureMarkdown(failures) {
  if (failures.length === 0) {
    return '';
  }

  // Preserve first-seen shard order.
  const byShard = new Map();
  for (const failure of failures) {
    if (!byShard.has(failure.shard)) {
      byShard.set(failure.shard, []);
    }
    byShard.get(failure.shard).push(failure);
  }

  const lines = ['## 🧪 Database Failures by Shard', ''];

  for (const [shard, shardFailures] of byShard) {
    const aborted = shardFailures.filter((failure) => failure.secondary);
    const concrete = shardFailures.filter((failure) => !failure.secondary);

    lines.push(`### ${shard}`);

    // Every DB failure, in execution order, classified per row — no cross-row
    // causal claim. RefreshDatabase isolates each test's transaction, so a
    // 25P02 in one test is not a proven continuation of an error in another.
    const shown = shardFailures.slice(0, MAX_ROWS_PER_SHARD);
    for (const failure of shown) {
      const kind = failure.secondary ? 'aborted transaction' : 'constraint/query error';
      lines.push(`- \`SQLSTATE[${failure.sqlstate}]\` (${kind}) — \`${failure.class}::${failure.name}\``);
    }
    if (shardFailures.length > shown.length) {
      lines.push(`- …and ${shardFailures.length - shown.length} more`);
    }

    lines.push('');

    if (concrete.length > 0) {
      const first = concrete[0];
      lines.push(
        `> Most likely root cause to check first: \`SQLSTATE[${first.sqlstate}]\` in `
          + `\`${first.class}::${first.name}\`.`,
      );
    }
    if (aborted.length > 0) {
      lines.push(
        `> ${aborted.length} \`SQLSTATE[${ABORTED_TRANSACTION_SQLSTATE}]\` (aborted-transaction) `
          + `failure(s): \`RefreshDatabase\` isolates every test's transaction, so treat each as its `
          + `own failure to investigate (its trigger may be untagged, or leaked from an earlier `
          + `test) — not a guaranteed cascade of the error above.`,
      );
    }

    lines.push('');
  }

  return lines.join('\n');
}

module.exports = {
  collectDatabaseFailures,
  buildDatabaseFailureMarkdown,
  ABORTED_TRANSACTION_SQLSTATE,
};

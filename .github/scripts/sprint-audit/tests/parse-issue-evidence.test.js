'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseSessions,
  parseUncheckedTasks,
  parseTrackedField,
  minutesBetween,
  isRealDate,
} = require('../parse-issue-evidence.js');
const { issueBody } = require('./helpers.js');

test('minutesBetween handles a normal span and a midnight crossing', () => {
  assert.equal(minutesBetween('10:00', '11:30'), 90);
  assert.equal(minutesBetween('23:30', '00:15'), 45);
});

test('parseSessions sums closed sessions and reports high confidence', () => {
  const body = issueBody({
    sessions: [
      { date: '2026-09-01', start: '09:00', end: '10:30' },
      { date: '2026-09-02', start: '14:00', end: '15:00' },
    ],
  });
  const result = parseSessions(body);
  assert.equal(result.trackedMinutes, 150);
  assert.equal(result.openSessions, 0);
  assert.equal(result.malformed, false);
  assert.equal(result.confidence, 'high');
});

test('parseSessions accepts "24:00" as a session end (but not as a start)', () => {
  const ok = parseSessions(issueBody({ sessions: [{ date: '2026-09-01', start: '23:00', end: '24:00' }] }));
  assert.equal(ok.trackedMinutes, 60);
  assert.equal(ok.confidence, 'high');

  const bad = parseSessions(issueBody({ sessions: [{ date: '2026-09-01', start: '24:00', end: '01:00' }] }));
  assert.equal(bad.trackedMinutes, 0);
  assert.equal(bad.confidence, 'low'); // the only entry is malformed
});

test('parseSessions flags an open session as medium confidence, not zero', () => {
  const body = issueBody({
    sessions: [
      { date: '2026-09-01', start: '09:00', end: '10:00' },
      { date: '2026-09-02', start: '14:00', end: '?' },
    ],
  });
  const result = parseSessions(body);
  assert.equal(result.trackedMinutes, 60);
  assert.equal(result.openSessions, 1);
  assert.equal(result.confidence, 'medium');
});

test('parseSessions marks invalid JSON as malformed + low confidence, not silently zero', () => {
  const body = issueBody({ sessionsRaw: '[ {oops not json} ]' });
  const result = parseSessions(body);
  assert.equal(result.malformed, true);
  assert.equal(result.confidence, 'low');
  assert.equal(result.trackedMinutes, 0);
  assert.match(result.reason, /did not parse/);
});

test('parseSessions treats an empty array as low confidence (no evidence)', () => {
  const result = parseSessions(issueBody({ sessions: [] }));
  assert.equal(result.confidence, 'low');
  assert.equal(result.malformed, false);
});

test('parseSessions on a body with no Sessions block at all is malformed + low', () => {
  const result = parseSessions('## Description\n\nNo time section here.\n');
  assert.equal(result.malformed, true);
  assert.equal(result.hasTimeSection, false);
  assert.equal(result.confidence, 'low');
});

test('a bare "deferred" / "follow-up" with no issue reference is NOT a disposition', () => {
  const body = `## ✅ Technical Tasks
- [ ] Retry logic — deferred
- [ ] Ledger view — follow-up needed
- [ ] Cache warmup — superseded
- [ ] Backoff — deferred to #1234
- [ ] Reversal — superseded by #999
- [ ] Import — this is out of scope
`;
  const result = parseUncheckedTasks(body);
  assert.equal(result.uncheckedCount, 6);
  // First three have no #NNN and are not terminal -> still undisposed.
  assert.equal(result.undisposedCount, 3);
  assert.equal(result.uncheckedTasks[0].hasDisposition, false);
  assert.equal(result.uncheckedTasks[1].hasDisposition, false);
  assert.equal(result.uncheckedTasks[2].hasDisposition, false);
  assert.equal(result.uncheckedTasks[3].dispositionKind, 'deferred');
  assert.equal(result.uncheckedTasks[4].dispositionKind, 'superseded');
  // "out of scope" is terminal — the work is abandoned, no tracking issue needed.
  assert.equal(result.uncheckedTasks[5].dispositionKind, 'out-of-scope');
});

test('a disposition phrase inside a negated clause is NOT a disposition', () => {
  const body = `## 🎯 Acceptance Criteria
- [ ] Existing ownership is not replaced by #123
- [ ] The record must not be tracked in #456
- [ ] Rows must not ever be split into #789
- [ ] State must not automatically be tracked in #790
- [ ] Real work — replaced by #999
`;
  const result = parseUncheckedTasks(body);
  assert.equal(result.uncheckedCount, 5);
  assert.equal(result.undisposedCount, 4);
  assert.equal(result.uncheckedTasks[4].dispositionKind, 'superseded');
});

test('a disposition wrapped onto the next indented line still counts', () => {
  const body = [
    '## ✅ Technical Tasks',
    '- [ ] Handle the migration rollback edge case',
    '      deferred to #1234',
    '- [ ] Genuinely unfinished',
  ].join('\n');
  const result = parseUncheckedTasks(body);
  assert.equal(result.uncheckedCount, 2);
  assert.equal(result.undisposedCount, 1);
  assert.equal(result.uncheckedTasks[0].dispositionKind, 'deferred');
  assert.deepEqual(result.dispositionRefs, [1234]);
});

test('an UNTERMINATED HTML comment hides everything after it', () => {
  const body = [
    '## ✅ Technical Tasks',
    '- [x] Real shipped work',
    '<!-- everything below is template noise, no closing tag',
    '- [ ] Example task one',
    '- [ ] Example task two',
  ].join('\n');
  const result = parseUncheckedTasks(body);
  assert.equal(result.checkedCount, 1);
  assert.equal(result.uncheckedCount, 0);
});

test('a short task text is disposed by an exact terminal-section entry', () => {
  const body = `## ✅ Technical Tasks
- [ ] Docs
- [ ] Tests

## Out of scope
- Docs
`;
  const result = parseUncheckedTasks(body);
  assert.equal(result.uncheckedTasks[0].dispositionKind, 'out-of-scope');
  assert.equal(result.uncheckedTasks[1].hasDisposition, false);
});

test('a disposition verb near an issue ref is NOT a delegation unless bound to it', () => {
  const body = `## ✅ Technical Tasks
- [ ] Verify tracked time for #587 is shown in the report
- [ ] Split the response from #123 into rows
- [ ] Show the moved rows from #55 in the ledger
- [ ] Render follow-up #123 on the dashboard
- [ ] Real work — moved to #4321
- [ ] Other work — see #4322
- [ ] Edge case — follow-up in #4323
`;
  const result = parseUncheckedTasks(body);
  assert.equal(result.uncheckedCount, 7);
  // First four: the verb is part of the requirement, or the connector is missing.
  assert.equal(result.undisposedCount, 4);
  assert.equal(result.uncheckedTasks[4].dispositionKind, 'follow-up'); // "moved to #4321"
  assert.equal(result.uncheckedTasks[5].dispositionKind, 'follow-up'); // trailing "see #4322"
  assert.equal(result.uncheckedTasks[6].dispositionKind, 'follow-up'); // "follow-up in #4323"
});

test('a trailing requirement qualifier containing "out of scope" does not dispose the item', () => {
  const body = `## 🎯 Acceptance Criteria
- [ ] Return 403 (when the Location ID is out of scope)
- [ ] Skip the row — provided it is out of scope for this import
- [ ] Bulk import — out of scope
`;
  const result = parseUncheckedTasks(body);
  assert.equal(result.uncheckedCount, 3);
  assert.equal(result.undisposedCount, 2);
  assert.equal(result.uncheckedTasks[0].hasDisposition, false);
  assert.equal(result.uncheckedTasks[1].hasDisposition, false);
  assert.equal(result.uncheckedTasks[2].dispositionKind, 'out-of-scope');
});

test('a terminal section entry disposes an item only on a whole-entry match, not a prefix', () => {
  const body = `## 🎯 Acceptance Criteria
- [ ] Return errors
- [ ] Return errors in XML

## Out of scope
- Return errors in XML
`;
  const result = parseUncheckedTasks(body);
  assert.equal(result.uncheckedCount, 2);
  // Only the XML variant is listed as out of scope; the broader item stays open.
  assert.equal(result.uncheckedTasks[0].hasDisposition, false);
  assert.equal(result.uncheckedTasks[1].dispositionKind, 'out-of-scope');
});

test('a terminal section keeps a real "(qualifier)" in the task name when matching', () => {
  const body = `## ✅ Technical Tasks
- [ ] Render the stock widget (mobile)
- [ ] Wire the retry backoff into the client

## Out of scope
- Render the stock widget (mobile)
- Wire the retry backoff into the client — moved to #4321
`;
  const result = parseUncheckedTasks(body);
  assert.equal(result.undisposedCount, 0);
  assert.equal(result.uncheckedTasks[0].dispositionKind, 'out-of-scope'); // "(mobile)" kept
  assert.equal(result.uncheckedTasks[1].dispositionKind, 'follow-up'); // annotation stripped
});

test('parseTrackedField ignores a "**Tracked:**" example outside the Time section', () => {
  const body = [
    '## Description',
    '',
    'Docs show it like `**Tracked:** 9h` in the example below:',
    '',
    '```markdown',
    '- **Tracked:** 9h',
    '```',
    '',
    '## ⏱️ Time',
    '',
    '### 📊 Estimates',
    '- **Tracked:** `1h00m`',
    '',
    '### 📅 Sessions',
    '```json',
    JSON.stringify([{ date: '2026-09-01', start: '09:00', end: '10:00' }]),
    '```',
  ].join('\n');
  const result = parseSessions(body);
  assert.equal(result.statedTrackedMinutes, 60); // the real field, not the 9h example
  assert.equal(result.trackedMismatch, false);
  assert.equal(result.confidence, 'high');
});

test('parseUncheckedTasks handles a nested 3-backtick example inside a 4-backtick fence', () => {
  const body = [
    '## ✅ Technical Tasks',
    '',
    '````markdown',
    '```markdown',
    '## ✅ Technical Tasks',
    '- [ ] 📂 Example task one',
    '- [ ] 🔧 Example task two',
    '```',
    '````',
    '',
    '- [ ] Real remaining work — deferred to #999',
  ].join('\n');
  const result = parseUncheckedTasks(body);
  assert.equal(result.uncheckedCount, 1);
  assert.equal(result.undisposedCount, 0);
});

test('a delimiter line with an info string does not close a fenced block', () => {
  const body = [
    '## ✅ Technical Tasks',
    '',
    '````',
    '````text',
    '## ✅ Technical Tasks',
    '- [ ] 📂 Example task',
    '````',
    '',
    '- [x] Real work shipped',
  ].join('\n');
  const result = parseUncheckedTasks(body);
  // The "````text" line is content (a closer carries no info string), so the
  // example checklist stays inside the fence and is not scanned.
  assert.equal(result.uncheckedCount, 0);
  assert.equal(result.checkedCount, 1);
});

test('"out of scope" inside the requirement text does NOT dispose the item', () => {
  const body = `## 🎯 Acceptance Criteria
- [ ] Reject out of scope Location IDs with 403
- [ ] Note: skip out of scope rows during import
- [ ] Bulk spreadsheet import — out of scope
- [ ] Legacy adapter (won't do)
`;
  const result = parseUncheckedTasks(body);
  assert.equal(result.uncheckedCount, 4);
  // First two: the phrase is part of the requirement, not a trailing annotation.
  assert.equal(result.undisposedCount, 2);
  assert.equal(result.uncheckedTasks[0].hasDisposition, false);
  assert.equal(result.uncheckedTasks[1].hasDisposition, false);
  // Last two: an explicit trailing "— out of scope" / "(won't do)" annotation.
  assert.equal(result.uncheckedTasks[2].dispositionKind, 'out-of-scope');
  assert.equal(result.uncheckedTasks[3].dispositionKind, 'out-of-scope');
});

test('a leading terminal phrase disposes only when it is the whole item', () => {
  const body = `## 🎯 Acceptance Criteria
- [ ] Out of scope Location IDs must return 403
- [ ] Won't do gracefully when the queue is full
- [ ] out of scope
- [ ] Won't do.
`;
  const result = parseUncheckedTasks(body);
  assert.equal(result.uncheckedCount, 4);
  assert.equal(result.undisposedCount, 2); // first two are requirements
  assert.equal(result.uncheckedTasks[0].hasDisposition, false);
  assert.equal(result.uncheckedTasks[1].hasDisposition, false);
  assert.equal(result.uncheckedTasks[2].dispositionKind, 'out-of-scope');
  assert.equal(result.uncheckedTasks[3].dispositionKind, 'out-of-scope');
});

test('parseSessions ignores an unrelated JSON fence when there is no Sessions heading', () => {
  const body = `## Description

Example response:

\`\`\`json
[{ "date": "2026-09-01", "start": "09:00", "end": "17:00" }]
\`\`\`
`;
  const result = parseSessions(body);
  assert.equal(result.malformed, true);
  assert.equal(result.trackedMinutes, 0);
  assert.equal(result.confidence, 'low');
});

test('parseSessions ignores a non-canonical "## API Sessions" heading', () => {
  const body = [
    '## API Sessions',
    '```json',
    '[{ "date": "2026-09-01", "start": "09:00", "end": "18:00" }]',
    '```',
  ].join('\n');
  const result = parseSessions(body);
  assert.equal(result.malformed, true);
  assert.equal(result.trackedMinutes, 0);
});

test('parseTrackedField ignores a non-canonical "## API Response Time" heading', () => {
  const body = [
    '## API Response Time',
    '- **Tracked:** 9h',
    '',
    '## ⏱️ Time',
    '### 📊 Estimates',
    '- **Tracked:** `1h00m`',
    '### 📅 Sessions',
    '```json',
    JSON.stringify([{ date: '2026-09-01', start: '09:00', end: '10:00' }]),
    '```',
  ].join('\n');
  const result = parseSessions(body);
  assert.equal(result.statedTrackedMinutes, 60);
  assert.equal(result.trackedMismatch, false);
});

test('parseSessions bounds the search to the Sessions section', () => {
  const body = `### 📅 Sessions
\`\`\`json
[{ "date": "2026-09-01", "start": "09:00", "end": "10:00" }]
\`\`\`

## Appendix
\`\`\`json
[{ "date": "2026-09-02", "start": "09:00", "end": "18:00" }]
\`\`\`
`;
  const result = parseSessions(body);
  assert.equal(result.trackedMinutes, 60);
});

test('isRealDate rejects a syntactically-shaped but impossible date', () => {
  assert.equal(isRealDate('2026-09-01'), true);
  assert.equal(isRealDate('2026-02-31'), false);
  assert.equal(isRealDate('2026-13-01'), false);
  assert.equal(isRealDate('not-a-date'), false);
});

test('parseSessions treats an impossible calendar date as a malformed entry, not tracked time', () => {
  const body = issueBody({
    sessions: [
      { date: '2026-02-31', start: '09:00', end: '11:00' },
      { date: '2026-09-02', start: '09:00', end: '10:00' },
    ],
  });
  const result = parseSessions(body);
  assert.equal(result.trackedMinutes, 60); // only the real-dated session counts
  assert.equal(result.confidence, 'medium');
  assert.match(result.reason, /malformed/);
});

test('parseTrackedField reads the stated Tracked value, or null when not set', () => {
  assert.equal(parseTrackedField('- **Tracked:** `2h35m`'), 155);
  assert.equal(parseTrackedField('- **Tracked:** 2.5h'), 150);
  assert.equal(parseTrackedField('- **Tracked:** 45m'), 45);
  assert.equal(parseTrackedField('- **Tracked:** _in progress_'), null);
});

function bodyWithTracked(tracked, sessions) {
  return (
    `## ⏱️ Time\n\n### 📊 Estimates\n- **Tracked:** ${tracked}\n\n` +
    `### 📅 Sessions\n\`\`\`json\n${JSON.stringify(sessions)}\n\`\`\`\n`
  );
}

test('parseSessions flags a stated Tracked value that disagrees with the Sessions sum', () => {
  const result = parseSessions(
    bodyWithTracked('`6h00m`', [{ date: '2026-09-01', start: '09:00', end: '10:00' }]),
  );
  assert.equal(result.trackedMinutes, 60);
  assert.equal(result.trackedMismatch, true);
  assert.equal(result.confidence, 'medium');
  assert.match(result.reason, /disagrees with the Sessions sum/);
});

test('parseSessions flags even a small (>1 min) tracked-time drift', () => {
  // 70 min stated vs 60 min of sessions — a 10-minute drift, previously ignored.
  const result = parseSessions(
    bodyWithTracked('`1h10m`', [{ date: '2026-09-01', start: '09:00', end: '10:00' }]),
  );
  assert.equal(result.trackedMismatch, true);
  assert.equal(result.confidence, 'medium');
});

test('parseSessions tolerates a 1-minute decimal-hour rounding difference', () => {
  // `2.6h` = 156 min rounds from an actual 155 min — not a real desync.
  const result = parseSessions(
    bodyWithTracked('`2.6h`', [
      { date: '2026-09-01', start: '09:00', end: '10:35' },
      { date: '2026-09-02', start: '09:00', end: '10:00' },
    ]),
  );
  assert.equal(result.trackedMinutes, 155);
  assert.equal(result.trackedMismatch, false);
  assert.equal(result.confidence, 'high');
});

test('parseUncheckedTasks separates disposed from undisposed unchecked items', () => {
  const body = `## ✅ Technical Tasks
- [x] Done thing
- [ ] Genuinely incomplete thing
- [ ] Old idea — deferred to #1234
- [ ] Superseded by #999
- [ ] Handled as follow-up in #777
`;
  const result = parseUncheckedTasks(body);
  assert.equal(result.checkedCount, 1);
  assert.equal(result.uncheckedCount, 4);
  assert.equal(result.undisposedCount, 1);
  assert.equal(result.uncheckedTasks[0].hasDisposition, false);
  assert.equal(result.uncheckedTasks[1].dispositionKind, 'deferred');
  assert.equal(result.uncheckedTasks[2].dispositionKind, 'superseded');
  assert.equal(result.uncheckedTasks[3].dispositionKind, 'follow-up');
});

test('a deferral section disposes an item only when its line names it AND carries a reference', () => {
  const body = `## ✅ Technical Tasks
- [ ] Wire the retry backoff into the client
- [ ] Add the migration rollback path
- [ ] Backfill the historical rows

## 🔀 Deferred
- Wire the retry backoff into the client — moved to #4321
- Add the migration rollback path — moved to #4321
`;
  const result = parseUncheckedTasks(body);
  assert.equal(result.uncheckedCount, 3);
  // Third item not listed -> undisposed.
  assert.equal(result.undisposedCount, 1);
  assert.equal(result.uncheckedTasks[0].dispositionKind, 'follow-up');
  assert.equal(result.uncheckedTasks[2].hasDisposition, false);
});

test('a deferral section that repeats task text but carries NO reference does not dispose it', () => {
  const body = `## ✅ Technical Tasks
- [ ] Wire the retry backoff into the client
- [ ] Add the migration rollback path

## 🔀 Deferred
- Wire the retry backoff into the client
- Add the migration rollback path
`;
  const result = parseUncheckedTasks(body);
  // Repeated text under a non-terminal "Deferred" heading with no #NNN -> still undisposed.
  assert.equal(result.undisposedCount, 2);
});

test('a terminal "Out of scope" heading disposes the bare items it lists', () => {
  const body = `## ✅ Technical Tasks
- [ ] Wire the retry backoff into the client
- [ ] Add the migration rollback path

## Out of scope
- Wire the retry backoff into the client
`;
  const result = parseUncheckedTasks(body);
  assert.equal(result.uncheckedTasks[0].dispositionKind, 'out-of-scope');
  assert.equal(result.uncheckedTasks[0].hasDisposition, true);
  assert.equal(result.uncheckedTasks[1].hasDisposition, false);
});

test('"Not in scope" and "Won\'t do" headings are also terminal deferral sections', () => {
  for (const heading of ['## Not in scope', "## Won't do", '### Wont do']) {
    const body = `## ✅ Technical Tasks
- [ ] Legacy migration adapter

${heading}
- Legacy migration adapter
`;
    const result = parseUncheckedTasks(body);
    assert.equal(result.undisposedCount, 0, `heading "${heading}" should dispose the listed item`);
    assert.equal(result.uncheckedTasks[0].dispositionKind, 'out-of-scope');
  }
});

test('a vague deferral heading does NOT blanket-dispose unrelated unchecked work', () => {
  const body = `## ✅ Technical Tasks
- [ ] Implement the transfer endpoint
- [ ] Add the audit ledger view

## Follow-up
Some items were carried over; see the next sprint.
`;
  const result = parseUncheckedTasks(body);
  assert.equal(result.undisposedCount, 2);
});

test('parseUncheckedTasks ignores checklist items inside fenced code blocks', () => {
  const body = `## ✅ Technical Tasks

Follow the standard template:

\`\`\`markdown
## ✅ Technical Tasks
- [ ] 📂 Example task one
- [ ] 🔧 Example task two
\`\`\`

- [x] Actually ship it
- [ ] Real remaining work — deferred to #999
`;
  const result = parseUncheckedTasks(body);
  assert.equal(result.checkedCount, 1);
  assert.equal(result.uncheckedCount, 1);
  assert.equal(result.undisposedCount, 0);
});

test('parseUncheckedTasks ignores checklist items inside HTML comments', () => {
  const body = `## ✅ Technical Tasks
<!--
Template guidance — replace with real tasks:
- [ ] Example task one
- [ ] Example task two
-->
- [x] Ship the real thing
`;
  const result = parseUncheckedTasks(body);
  assert.equal(result.uncheckedCount, 0);
  assert.equal(result.checkedCount, 1);
});

test('parseSessions ignores a JSON fence that only appears inside an HTML comment', () => {
  const body = `## Description
<!--
\`\`\`json
[{ "date": "2026-09-01", "start": "09:00", "end": "18:00" }]
\`\`\`
-->
`;
  const result = parseSessions(body);
  assert.equal(result.malformed, true);
  assert.equal(result.trackedMinutes, 0);
});

test('parseUncheckedTasks ignores checkboxes outside delivery sections', () => {
  const body = `## Rollout notes
- [ ] Announce in #general
- [ ] Flip the feature flag next Monday

## ✅ Acceptance Criteria
- [x] Endpoint returns 201 on success
- [ ] Endpoint rejects an unknown Location — deferred to #900
`;
  const result = parseUncheckedTasks(body);
  // The two Rollout checkboxes are not delivery work and must not count.
  assert.equal(result.uncheckedCount, 1);
  assert.equal(result.checkedCount, 1);
  assert.equal(result.undisposedCount, 0);
});

test('stripFencedCode: a 4-space-indented ``` is indented code, not a fence opener', () => {
  const body = [
    '## ✅ Technical Tasks',
    '',
    '    ```',
    '- [ ] Still a real task (the fence never opened)',
  ].join('\n');
  const result = parseUncheckedTasks(body);
  assert.equal(result.uncheckedCount, 1);
  assert.equal(result.undisposedCount, 1);
});

test('stripFencedCode: a backtick opener with a backtick in its info string is not a fence', () => {
  const body = [
    '## ✅ Technical Tasks',
    '',
    '```example `not-a-fence`',
    '- [ ] Still a real task',
  ].join('\n');
  const result = parseUncheckedTasks(body);
  assert.equal(result.uncheckedCount, 1);
  assert.equal(result.undisposedCount, 1);
});

test('a delivery heading that merely mentions a disposition word is not a deferral section', () => {
  const body = `## Tests for deferred retries
- [ ] Add the backoff test
- [ ] Add the jitter test

## Acceptance Criteria for follow-up routing
- [ ] Route the follow-up to the right queue
`;
  const result = parseUncheckedTasks(body);
  // "Tests" and "Acceptance Criteria" are delivery headings — tasks stay visible.
  assert.equal(result.uncheckedCount, 3);
  assert.equal(result.undisposedCount, 3);
});

test('"see #NNN" inside a requirement qualifier is not a follow-up disposition', () => {
  const body = `## 🎯 Acceptance Criteria
- [ ] Render warning (ensure users see #123 in the dashboard)
- [ ] Other work — see #456
`;
  const result = parseUncheckedTasks(body);
  assert.equal(result.uncheckedTasks[0].hasDisposition, false);
  assert.equal(result.uncheckedTasks[1].dispositionKind, 'follow-up');
});

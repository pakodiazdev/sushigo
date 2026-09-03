'use strict';

// Parse a single GitHub Issue body for the evidence the closure audit reconciles:
//   - the `## 📅 Sessions` JSON array  -> tracked minutes + a confidence rating
//   - unchecked `- [ ]` checklist items -> whether each carries an explicit
//     deferral/superseded/follow-up disposition
//
// A malformed or missing Sessions array must never be silently treated as zero
// tracked time — it downgrades metric confidence instead. See
// doc/conventions/sprint-closure-audit.md.

// An unchecked item is only "disposed" when it says so unambiguously.
//   - deferred / superseded / follow-up all mean "this work still needs doing,
//     elsewhere" — so they MUST reference a tracked Issue (#NNN). A bare
//     "deferred" / "follow-up needed" with no reference leaves real work
//     untracked and must not pass the closure gate.
//   - out-of-scope / won't-do is terminal (no #NNN expected) but MUST appear as
//     an explicit annotation — a trailing "— out of scope" / "(out of scope)"
//     clause, or the item itself being just that note. "out of scope" buried in
//     the requirement ("Reject out of scope IDs with 403") is not a disposition.
// The disposition verb must be bound directly to the Issue reference — "deferred
// to #NNN", "moved to #NNN" — not merely near it. A requirement that happens to
// mention an Issue ("Verify tracked time for #587 is shown", "Split the response
// from #123 into rows") is not a delegation.
const REFERENCED_DEFERRAL_PATTERNS = [
  { kind: 'deferred', re: /\bdeferr?(?:ed|ing)?\s+to\s+#\d+\b/i },
  { kind: 'superseded', re: /\b(?:supersed(?:ed|es)|replaced|obsoleted?)\s+by\s+#\d+\b/i },
  {
    kind: 'follow-up',
    // A connector is REQUIRED — "follow-up in #NNN", not "render follow-up #123".
    re: /\b(?:follow[- ]?up|carried over)\s+(?:in|to)\s+#\d+\b|\bfollow[- ]?up:\s*#\d+\b|\btracked\s+(?:in|by)\s+#\d+\b|\bmoved\s+to\s+#\d+\b|\bsplit\s+into\s+#\d+\b/i,
  },
];

// Weaker follow-up markers (`→ #NNN`, `see #NNN`) are accepted ONLY when they sit
// in the item's trailing annotation, never mid-requirement.
// The weaker `→ #NNN` / `see #NNN` markers count only when the trailing
// annotation IS that note — not when a requirement qualifier merely contains it
// ("(ensure users see #123 in the dashboard)").
const TRAILING_FOLLOWUP = /^(?:→|->|see)\s*#\d+\s*$/i;

// An annotation counts as a terminal note only when the phrase IS the note —
// optionally with a "this is" / "it's" lead — not when it merely appears inside a
// trailing requirement qualifier ("(when the ID is out of scope)").
const OUT_OF_SCOPE_ANNOTATION =
  /^(?:(?:this\s+is|it'?s|now|currently)\s+)?(?:out of scope|not in scope|won'?t\s*do|wont do)\b[\s.:;!-]*$/i;

// The trailing annotation clause of a checklist line — text inside a final
// "(...)", or after the last em/en-dash or " -- " separator. A leading "Note:"
// or a mid-sentence phrase is deliberately NOT treated as an annotation.
function trailingAnnotation(text) {
  const paren = text.match(/\(([^()]+)\)\s*$/);
  if (paren) {
    return paren[1].trim();
  }
  const dashed = text.match(/.*(?:—|–|\s--?\s)\s*(.+?)\s*$/);
  return dashed ? dashed[1].trim() : null;
}

// A disposition heading STARTS with the disposition phrase (after optional emoji
// / number decoration), optionally followed by "tasks"/"work"/"items" and/or a
// "/ …" continuation. "## Tests for deferred retries" is a delivery heading, not
// a deferral section.
const DEFERRAL_SECTION_HEADING =
  /^#{2,6}\s+(?:[^\w\s]+\s+)?(?:\d+[.)]\s+)?(?:deferred?|out of scope|not in scope|not (?:done|shipped|delivered)|won'?t\s*do|wont do|superseded|carried over|follow[- ]?up)\b(?:\s+(?:tasks?|work|items?|criteria))?\s*(?:[/·—–-].*)?$/i;

// A section heading that itself declares the work terminally abandoned — items it
// lists need no per-item `#NNN` because nothing is being tracked elsewhere. Every
// phrase here must also appear in DEFERRAL_SECTION_HEADING above, or the section
// is never captured and this check is unreachable.
const TERMINAL_SECTION_HEADING = /out of scope|not in scope|won'?t\s*do|wont do/i;

// Only checklist items under a delivery-relevant heading are "unfinished work" a
// closure gate should care about. A stray `- [ ]` in a Rollout / Notes /
// template-quote section must not fail closure.
const DELIVERY_SECTION_HEADING =
  /technical tasks|acceptance criteria|\btests?\b|validation|\btasks\b|check-?list|to-?do|deliverables/i;

const HEADING_RE = /^(#{2,6})\s+(.*\S)\s*$/;

// HTML comment regions (`<!-- ... -->`, multi-line included) are non-rendered
// template guidance — a `- [ ]` example inside one is not real unfinished work,
// and a JSON fence inside one is not real session evidence. An UNTERMINATED
// `<!--` hides everything after it (GitHub renders it that way), so strip to EOF.
function stripHtmlComments(text) {
  return text.replace(/<!--[\s\S]*?-->/g, '').replace(/<!--[\s\S]*$/, '');
}

// Fenced code blocks (``` … ``` / ~~~ … ~~~) are quoted examples — a `- [ ]`
// inside one (e.g. the tasks.md template pasted into an issue body) is not real
// unfinished work. Used only for the checklist scan, never for Sessions parsing
// (that one deliberately reads a ```json fence).
function stripFencedCode(text) {
  const out = [];
  let fence = null; // { char, len } of the opening delimiter
  for (const line of text.split('\n')) {
    if (fence) {
      // A closing fence carries no info string — it is the delimiter run followed
      // only by whitespace — and must be same char and at least the opening
      // length, so a nested ``` inside an outer ```` block doesn't end it early.
      // At most 3 leading spaces (4+ = indented code, not a fence).
      const close = line.match(/^ {0,3}(`{3,}|~{3,})[ \t]*$/);
      if (close && close[1][0] === fence.char && close[1].length >= fence.len) {
        fence = null;
      }
      continue;
    }
    const open = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (open) {
      const [, delim, info] = open;
      // A backtick-fence opener's info string may not contain a backtick
      // (CommonMark) — `` ```example `x` `` is not a fence.
      if (delim[0] === '`' && info.includes('`')) {
        out.push(line);
        continue;
      }
      fence = { char: delim[0], len: delim.length };
      continue;
    }
    out.push(line);
  }
  return out.join('\n');
}

function normalizeForMatch(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Every deferral-headed section, as { terminal, lines } (heading → next heading
// of the same or shallower depth). `terminal` means the heading itself declares
// the work abandoned (out of scope / won't do).
function collectDeferralSections(lines) {
  const sections = [];
  let current = null;
  let capturingDepth = 0;
  for (const line of lines) {
    const heading = line.match(HEADING_RE);
    if (heading) {
      const depth = heading[1].length;
      if (capturingDepth && depth <= capturingDepth) {
        capturingDepth = 0;
        current = null;
      }
      if (!capturingDepth && DEFERRAL_SECTION_HEADING.test(line)) {
        capturingDepth = depth;
        current = { terminal: TERMINAL_SECTION_HEADING.test(line), lines: [] };
        sections.push(current);
        continue;
      }
      if (current) {
        current.lines.push(line);
      }
      continue;
    }
    if (current) {
      current.lines.push(line);
    }
  }
  return sections;
}

// A deferral section disposes an unchecked item only when a line in it names the
// item as a WHOLE entry (not a substring) AND carries a real disposition. Two
// forms match: the entry verbatim (qualifiers like "(mobile)" kept — a bare
// terminal-section listing), or the entry with a *verified* trailing disposition
// annotation removed ("- Foo — moved to #NNN" ⇒ "Foo"). `- Return errors in XML`
// does not dispose `- [ ] Return errors`.
function sectionDispositionForItem(sections, itemText) {
  const needle = normalizeForMatch(itemText);
  if (!needle) {
    return null;
  }
  // Exact whole-entry comparison is safe at any length — a short task like
  // "Docs" listed verbatim under "## Out of scope" is still disposed.
  for (const section of sections) {
    for (const line of section.lines) {
      const entry = line.replace(/^\s*[-*]\s+/, '').trim();
      const inline = lineHasDisposition(entry);

      if (normalizeForMatch(entry) === needle) {
        if (inline) {
          return inline;
        }
        if (section.terminal) {
          return 'out-of-scope';
        }
        continue;
      }

      // Only strip a suffix when the line is a verified disposition — otherwise a
      // real "(mobile)" / "— …" qualifier in the task name would be lost. Strip
      // just the FINAL annotation separator (a *spaced* em/en/-- dash, so an
      // unspaced "desktop–mobile" in the task name survives).
      if (inline) {
        const core = entry
          .replace(/\s*\([^()]*\)\s*$/, '')
          .replace(/\s+(?:—|–|--)\s+[^—–]*$/, '')
          .trim();
        if (normalizeForMatch(core) === needle) {
          return inline;
        }
      }
    }
  }
  return null;
}

function fmtMins(total) {
  const m = Math.max(0, Math.round(total));
  return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}m`;
}

// The stated `Tracked` value in the issue body, in minutes — or null when it is
// absent / `_in progress_` / `_not started_` (nothing to reconcile against).
// Accepts `2h35m`, `2h`, `45m`, `2.5h`, optionally wrapped in backticks. Bounded
// to the `## ⏱️ Time` section (fenced / commented examples stripped) so an
// unrelated `**Tracked:** …` elsewhere in the body is not picked up.
function parseTrackedField(issueBody) {
  // The canonical heading's visible text is exactly "Time" (after an optional
  // emoji) — not "Time tracking example" or "Time zone behavior".
  const timeHeading = issueBody.match(/^##\s+(?:[^\w\s]+\s+)?Time\s*$/im);
  let scope = issueBody;
  if (timeHeading) {
    const after = issueBody.slice(timeHeading.index + timeHeading[0].length);
    const nextHeading = after.match(/^##\s+/m);
    scope = nextHeading ? after.slice(0, nextHeading.index) : after;
  }
  scope = stripFencedCode(stripHtmlComments(scope));
  const m = scope.match(/\*\*Tracked:\*\*\s*`?\s*([0-9]+(?:\.[0-9]+)?\s*h(?:\s*[0-9]+\s*m)?|[0-9]+\s*m)\s*`?/i);
  if (!m) {
    return null;
  }
  const token = m[1].replace(/\s+/g, '').toLowerCase();
  const hm = token.match(/^([0-9]+)h([0-9]+)m$/);
  if (hm) {
    return Number(hm[1]) * 60 + Number(hm[2]);
  }
  const h = token.match(/^([0-9]+(?:\.[0-9]+)?)h$/);
  if (h) {
    return Math.round(Number(h[1]) * 60);
  }
  const min = token.match(/^([0-9]+)m$/);
  if (min) {
    return Number(min[1]);
  }
  return null;
}

function minutesBetween(start, end) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins < 0) {
    // Session crossed midnight; treat `end` as the following day.
    mins += 24 * 60;
  }
  return mins;
}

const TIME_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;
// `24:00` is a valid END-of-day marker used in existing session evidence; never
// a valid START. `minutesBetween` computes it correctly (1440 − start).
const END_TIME_RE = /^(24:00|([01]?\d|2[0-3]):[0-5]\d)$/;
const DATE_SHAPE_RE = /^\d{4}-\d{2}-\d{2}$/;

// `2026-02-31` is the right shape but not a real day — reject it so it cannot
// inflate tracked totals or corrupt same-window classification.
function isRealDate(value) {
  if (!DATE_SHAPE_RE.test(value)) {
    return false;
  }
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function extractSessionsBlock(issueBody) {
  // A "Sessions" heading must exist — otherwise there is no session evidence,
  // and the first unrelated ```json fence elsewhere in the body (an API example,
  // say) must NOT be mistaken for tracked time.
  // The canonical heading's visible text is exactly "Sessions" (after optional
  // emoji decoration) — not "API Sessions" or "Example Sessions".
  const headingMatch = issueBody.match(/^#{2,6}\s+(?:[^\w\s]+\s+)?Sessions\s*$/im);
  if (!headingMatch) {
    return null;
  }
  let section = issueBody.slice(headingMatch.index + headingMatch[0].length);
  // Bound the search to this section — stop at the next heading of any level.
  const nextHeading = section.match(/^#{1,6}\s+\S/m);
  if (nextHeading) {
    section = section.slice(0, nextHeading.index);
  }
  const fenced = section.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
  return fenced ? fenced[1] : null;
}

function parseSessions(rawIssueBody) {
  const issueBody = stripHtmlComments(rawIssueBody);
  const hasTimeSection =
    /^##\s+(?:[^\w\s]+\s+)?Time\s*$/im.test(issueBody) ||
    /^#{2,4}\s+(?:[^\w\s]+\s+)?Estimates\s*$/im.test(issueBody);
  const raw = extractSessionsBlock(issueBody);

  if (raw === null) {
    return {
      sessions: [],
      trackedMinutes: 0,
      openSessions: 0,
      malformed: true,
      hasTimeSection,
      confidence: 'low',
      reason: 'no Sessions JSON block found',
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      sessions: [],
      trackedMinutes: 0,
      openSessions: 0,
      malformed: true,
      hasTimeSection,
      confidence: 'low',
      reason: 'Sessions JSON did not parse',
    };
  }

  if (!Array.isArray(parsed)) {
    return {
      sessions: [],
      trackedMinutes: 0,
      openSessions: 0,
      malformed: true,
      hasTimeSection,
      confidence: 'low',
      reason: 'Sessions block is not a JSON array',
    };
  }

  let trackedMinutes = 0;
  let openSessions = 0;
  let badEntries = 0;
  const sessions = [];

  for (const entry of parsed) {
    if (!entry || typeof entry !== 'object' || !isRealDate(entry.date ?? '') || !TIME_RE.test(entry.start ?? '')) {
      badEntries += 1;
      continue;
    }
    if (entry.end === '?' || entry.end == null || entry.end === '') {
      openSessions += 1;
      sessions.push({ date: entry.date, start: entry.start, end: '?', minutes: 0 });
      continue;
    }
    if (!END_TIME_RE.test(entry.end)) {
      badEntries += 1;
      continue;
    }
    const mins = minutesBetween(entry.start, entry.end);
    trackedMinutes += mins;
    sessions.push({ date: entry.date, start: entry.start, end: entry.end, minutes: mins });
  }

  const emptyArray = parsed.length === 0;
  const allBad = parsed.length > 0 && badEntries === parsed.length;
  const malformed = allBad;

  let confidence = 'high';
  let reason = null;
  if (allBad) {
    confidence = 'low';
    reason = 'every Sessions entry was malformed';
  } else if (emptyArray) {
    confidence = 'low';
    reason = 'Sessions array is empty — no tracked evidence';
  } else if (badEntries > 0) {
    confidence = 'medium';
    reason = `${badEntries} malformed Sessions ${badEntries === 1 ? 'entry' : 'entries'} skipped`;
  } else if (openSessions > 0) {
    confidence = 'medium';
    reason = `${openSessions} open session(s) still recorded as "end": "?"`;
  }

  // A hand-edited `Tracked` value that disagrees with the Sessions sum is itself
  // a finding (doc/conventions/sprint-closure-audit.md §8) — the evidence is not
  // synchronized, so the metric cannot be trusted at face value. The issue body's
  // `Tracked` is exact once `/finish-pr` recomputes it from `Sessions`, so any
  // non-zero drift is real; a 1-minute grace only absorbs decimal-hour rounding.
  const statedTracked = parseTrackedField(issueBody);
  const trackedMismatch =
    statedTracked != null && openSessions === 0 && Math.abs(statedTracked - trackedMinutes) > 1;
  if (trackedMismatch && confidence === 'high') {
    confidence = 'medium';
    reason = `stated Tracked (${fmtMins(statedTracked)}) disagrees with the Sessions sum (${fmtMins(trackedMinutes)})`;
  }

  return {
    sessions,
    trackedMinutes,
    openSessions,
    statedTrackedMinutes: statedTracked,
    trackedMismatch,
    malformed,
    hasTimeSection,
    confidence,
    reason,
  };
}

// A disposition phrase inside a negated clause ("is not replaced by #123",
// "must not ever be tracked in #123") is a requirement, not a delegation. Allow
// several modifier words between the negation and the disposition verb.
function negatedBefore(text, index) {
  const prefix = text.slice(Math.max(0, index - 48), index);
  return /\b(?:not|never|cannot|won'?t|shan'?t|isn'?t|aren'?t|don'?t|doesn'?t|wasn'?t|weren'?t|n'?t)\b(?:\s+\w+){0,6}\s+$/i.test(prefix);
}

function lineHasDisposition(text) {
  // Verb-bound `#NNN` delegation: specific enough to accept anywhere on the line.
  for (const { kind, re } of REFERENCED_DEFERRAL_PATTERNS) {
    const m = re.exec(text);
    if (m && !negatedBefore(text, m.index)) {
      return kind;
    }
  }
  // Weaker markers only count as an explicit trailing annotation, or when the
  // whole item is literally that note.
  const annotation = trailingAnnotation(text);
  if (annotation) {
    if (TRAILING_FOLLOWUP.test(annotation)) {
      return 'follow-up';
    }
    if (OUT_OF_SCOPE_ANNOTATION.test(annotation.trim())) {
      return 'out-of-scope';
    }
  }
  // The leading form counts only when the terminal phrase IS the whole item
  // (modulo trailing punctuation) — "Out of scope Location IDs must return 403"
  // is a requirement about the input, not a disposition.
  if (/^(?:out of scope|not in scope|won'?t\s*do|wont do)[\s.:;,!-]*$/i.test(text.trim())) {
    return 'out-of-scope';
  }
  return null;
}

function parseUncheckedTasks(rawIssueBody) {
  const lines = stripFencedCode(stripHtmlComments(rawIssueBody)).split('\n');
  const deferralSections = collectDeferralSections(lines);

  const items = [];
  let checkedCount = 0;
  let inDeliverySection = false;
  let deliveryDepth = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const heading = line.match(HEADING_RE);
    if (heading) {
      const depth = heading[1].length;
      if (inDeliverySection && depth <= deliveryDepth) {
        inDeliverySection = false;
      }
      if (
        !inDeliverySection &&
        DELIVERY_SECTION_HEADING.test(line) &&
        !DEFERRAL_SECTION_HEADING.test(line)
      ) {
        inDeliverySection = true;
        deliveryDepth = depth;
      }
      continue;
    }

    if (!inDeliverySection) {
      continue;
    }

    const box = line.match(/^(\s*)[-*]\s+\[( |x|X)\]\s+(.*\S)\s*$/);
    if (!box) {
      continue;
    }
    if (box[2] !== ' ') {
      checkedCount += 1;
      continue;
    }

    // A list item can continue on the next indented lines ("deferred to #NNN"
    // wrapped below the checkbox). Fold those into the item's text.
    let text = box[3];
    for (let j = i + 1; j < lines.length; j += 1) {
      const cont = lines[j];
      if (cont.trim() === '') {
        break;
      }
      if (!/^\s/.test(cont) || /^\s*(?:[-*]\s|\d+[.)]\s|#{1,6}\s|```|~~~|\|)/.test(cont)) {
        break;
      }
      text += ` ${cont.trim()}`;
      i = j;
    }

    const inlineDisposition = lineHasDisposition(text);
    const sectionDisposition = inlineDisposition
      ? null
      : sectionDispositionForItem(deferralSections, text);
    const kind = inlineDisposition ?? sectionDisposition;
    const refMatch = kind && kind !== 'out-of-scope' ? text.match(/#(\d{1,6})\b/) : null;
    items.push({
      text,
      dispositionKind: kind,
      hasDisposition: Boolean(kind),
      dispositionRef: refMatch ? Number(refMatch[1]) : null,
    });
  }

  return {
    uncheckedTasks: items,
    checkedCount,
    uncheckedCount: items.length,
    undisposedCount: items.filter((i) => !i.hasDisposition).length,
    dispositionRefs: [...new Set(items.map((i) => i.dispositionRef).filter((n) => n != null))],
    hasDeferralSection: deferralSections.length > 0,
  };
}

module.exports = {
  parseSessions,
  parseUncheckedTasks,
  parseTrackedField,
  minutesBetween,
  isRealDate,
};

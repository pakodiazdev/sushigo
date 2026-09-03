'use strict';

// Parse a sprint document (doc/sprints/sprint-NNN-*.md) into the pieces the
// closure audit needs: frontmatter, the formally-scoped Issue numbers, the
// opportunistic Issue numbers, and the Execution Evidence rows.
//
// Real sprint documents do not all use the same scope-table layout (Sprint 006
// used "Route A — Execution Rounds", Sprint 007 uses "5.1 Included Issues"), so
// this parser is deliberately tolerant: it reads Issue numbers from the table
// rows of whichever of those sections exists, and treats everything it cannot
// resolve as a data gap the caller can override, never as zero.
//
// Canonical semantics: doc/conventions/sprint-closure-audit.md.

const STATUS_MARKERS = ['✅', '🚧', '⏳', '⚠️', '❌'];

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) {
    return { frontmatter: {}, body: markdown };
  }
  const frontmatter = {};
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!kv) {
      continue;
    }
    let value = kv[2].trim();
    // Strip surrounding quotes so `sprint: "007"` yields the string 007.
    value = value.replace(/^["']|["']$/g, '');
    frontmatter[kv[1]] = value;
  }
  return { frontmatter, body: markdown.slice(match[0].length) };
}

// Split a markdown body into `## ` sections keyed by their heading text.
function splitTopSections(body) {
  const sections = [];
  const lines = body.split('\n');
  let current = null;
  for (const line of lines) {
    const heading = line.match(/^##\s+(.*\S)\s*$/);
    if (heading && !line.startsWith('###')) {
      current = { heading: heading[1], lines: [] };
      sections.push(current);
    } else if (current) {
      current.lines.push(line);
    }
  }
  return sections.map((s) => ({ heading: s.heading, text: s.lines.join('\n') }));
}

// Within a `## ` section's text, isolate a single `### ` subsection by number
// prefix (e.g. "5.1", "5.4"). Returns '' when the subsection is absent.
function subsectionByNumber(sectionText, number) {
  const escaped = number.replace(/\./g, '\\.');
  const re = new RegExp(`^###\\s+${escaped}[\\s.].*$`, 'm');
  const start = sectionText.match(re);
  if (!start) {
    return '';
  }
  const from = sectionText.indexOf(start[0]) + start[0].length;
  const rest = sectionText.slice(from);
  const next = rest.match(/^###\s+/m);
  return next ? rest.slice(0, next.index) : rest;
}

const DEFAULT_OWNER = 'pakodiazdev';

// Resolve a repo token as written in a sprint doc (`dev-lab`, `sushigo-dev-lab`,
// `sushigo`, or a full `owner/repo`) to a full `owner/repo`, `null` for the
// audit's default repo, or the RAW token (unchanged) when it is present but
// unrecognized — so a typo like `unknown-repo#64` never silently collapses onto
// the default repo and is surfaced as `scope-no-evidence` instead.
function resolveRepoToken(token) {
  if (!token) {
    return null;
  }
  const t = token.trim().replace(/^`|`$/g, '');
  if (t.includes('/')) {
    return t;
  }
  if (/^sushigo$/i.test(t)) {
    return null; // default repo
  }
  if (/^(?:sushigo-)?dev-lab$/i.test(t)) {
    return `${DEFAULT_OWNER}/sushigo-dev-lab`;
  }
  return t; // unrecognized — preserve it so the ref cannot match a real issue
}

// The Issue a table row is *about* lives in a dedicated cell — `#NNN`, `[#NNN]`,
// `[#NNN](url)`, or a cross-repo `repo#NNN` / `owner/repo#NNN` — never a bare
// `#NNN` buried in prose. A cross-repo row may instead carry a bare `#NNN` cell
// plus a separate repo-token cell (Sprint 003 §13 layout). Returns
// `{ repo, number }` (repo = full `owner/repo` or null for the default repo), or
// null for a row with no dedicated Issue cell.
function rowIssueRef(line) {
  // Strip surrounding code/bold formatting so `` `dev-lab#72` `` / **#72** match.
  const cells = line.split('|').map((c) => c.trim().replace(/^[`*_]+|[`*_]+$/g, ''));
  let number = null;
  let inlineRepo = null;
  let columnRepo = null;
  for (const cell of cells) {
    // A real Issue cell MUST carry the `#` marker (optionally `repo#`) — a bare
    // numeric cell (a Route-table round number, say) is not an Issue reference.
    const m = cell.match(/^\[?(?:([\w.-]+(?:\/[\w.-]+)?)#|#)(\d{1,6})\]?(?:\([^)]*\))?$/);
    if (m && m[2] && number == null) {
      number = Number(m[2]);
      inlineRepo = m[1] ? resolveRepoToken(m[1]) : null;
      continue;
    }
    const repoCell = cell.match(/^`?((?:[\w.-]+\/)?[\w.-]*(?:dev-lab|sushigo))`?$/i);
    if (repoCell && !/\s/.test(cell)) {
      columnRepo = resolveRepoToken(repoCell[1]);
    }
  }
  if (number == null) {
    return null;
  }
  return { repo: inlineRepo ?? columnRepo ?? null, number };
}

// Distinct Issue refs from the dedicated Issue cell of each markdown table row.
// A footer/total row is skipped structurally (no `#NNN` cell), so a legit row
// whose title contains "total" ("#123 | Compute order total") is kept.
function issueRefsFromTableRows(text) {
  const seen = new Map();
  for (const line of text.split('\n')) {
    if (!line.trimStart().startsWith('|')) {
      continue;
    }
    const ref = rowIssueRef(line);
    if (ref) {
      seen.set(`${ref.repo ?? ''}#${ref.number}`, ref);
    }
  }
  return [...seen.values()];
}

// §5.1 "Included" is sometimes a bullet list rather than a table, with the Issue
// ref as a trailing `(`#NNN`)` / `(repo#NNN)` on each bullet (Sprint 005).
function issueRefsFromBullets(text) {
  const seen = new Map();
  for (const line of text.split('\n')) {
    if (!/^\s*[-*]\s+/.test(line)) {
      continue;
    }
    const m = line.match(/\(\s*`?\s*(?:([\w.-]+(?:\/[\w.-]+)?)#)?#?(\d{1,6})\s*`?\s*\)\s*\.?\s*$/);
    if (m && m[2]) {
      const repo = m[1] ? resolveRepoToken(m[1]) : null;
      seen.set(`${repo ?? ''}#${m[2]}`, { repo, number: Number(m[2]) });
    }
  }
  return [...seen.values()];
}

// All distinct refs from a §5.1-style block, whether it is a table or a bullet
// list.
function scopeRefsFromSection(text) {
  const table = issueRefsFromTableRows(text);
  const bullets = issueRefsFromBullets(text);
  const seen = new Map();
  for (const ref of [...table, ...bullets]) {
    seen.set(`${ref.repo ?? ''}#${ref.number}`, ref);
  }
  return [...seen.values()];
}

function issueNumbersFromTableRows(text) {
  return issueRefsFromTableRows(text).map((r) => r.number);
}

function leadingStatusMarker(line) {
  const cells = line.split('|').map((c) => c.trim());
  for (const cell of cells) {
    if (!cell) {
      continue;
    }
    for (const marker of STATUS_MARKERS) {
      if (cell.startsWith(marker)) {
        return marker;
      }
    }
    // Only inspect the first non-empty cell.
    break;
  }
  return null;
}

function parseSprintDoc(markdown) {
  const { frontmatter, body } = parseFrontmatter(markdown);
  const sections = splitTopSections(body);

  const scopeSection = sections.find((s) => /^5\.\s+Scope\b/.test(s.heading));
  const routeASection = sections.find((s) => /^7\.\s+Route A\b/.test(s.heading));
  const evidenceSection = sections.find((s) => /^13\.\s+Execution Evidence\b/.test(s.heading));

  let scopeRefs = [];
  let opportunisticRefs = [];

  if (scopeSection) {
    scopeRefs = scopeRefsFromSection(subsectionByNumber(scopeSection.text, '5.1'));
    opportunisticRefs = issueRefsFromTableRows(subsectionByNumber(scopeSection.text, '5.4'));
  }

  // The §5.1 count is the *initially selected* scope (`scope_issues` reconciles
  // against this — sprints.md §6). Prefer §5.1 even when Route A also lists
  // issues, so a §5.3 addition already copied into Route A doesn't inflate it.
  const fromFivePointOne = scopeRefs.length;

  // Fallback / supplement: Route A round tables also enumerate scoped Issues.
  if (scopeRefs.length === 0 && routeASection) {
    scopeRefs = issueRefsFromTableRows(routeASection.text);
  }

  const initialScopeCount = fromFivePointOne > 0 ? fromFivePointOne : scopeRefs.length;

  // Apply §5.3 Scope Changes — explicit additions/removals made after sprint
  // start (`sprints.md` §5.3). Sprint 001 removes issues in §5.3 while leaving
  // them in §5.1; Sprint 003 adds `dev-lab#72` only in §5.3.
  const refKey = (r) => `${r.repo ?? ''}#${r.number}`;
  if (scopeSection) {
    const scopeChanges = subsectionByNumber(scopeSection.text, '5.3');
    for (const line of scopeChanges.split('\n')) {
      if (!line.trimStart().startsWith('|')) {
        continue;
      }
      const ref = rowIssueRef(line);
      if (!ref) {
        continue;
      }
      const removed = /\|\s*(?:❌|⚠️)/.test(line) || /\|\s*(?:removed?|dropped?|cancell?ed?|superseded)\b/i.test(line);
      const added = !removed && /\|\s*added\b/i.test(line);
      if (removed) {
        scopeRefs = scopeRefs.filter((r) => refKey(r) !== refKey(ref));
      } else if (added && !scopeRefs.some((r) => refKey(r) === refKey(ref))) {
        scopeRefs.push(ref);
      }
    }
  }

  // Opportunistic Issues are never part of formal scope even if a stray
  // reference leaks into a scope table.
  const opportunisticKeys = new Set(opportunisticRefs.map(refKey));
  scopeRefs = scopeRefs.filter((r) => !opportunisticKeys.has(refKey(r)));

  const executionEvidence = [];
  if (evidenceSection) {
    for (const line of evidenceSection.text.split('\n')) {
      if (!line.trimStart().startsWith('|')) {
        continue;
      }
      const ref = rowIssueRef(line);
      if (!ref) {
        continue;
      }
      executionEvidence.push({ issue: ref.number, repo: ref.repo, status: leadingStatusMarker(line) });
    }
  }

  const byNum = (a, b) => a - b;
  const formalScopeIssues = [...new Set(scopeRefs.map((r) => r.number))].sort(byNum);
  const opportunisticIssues = [...new Set(opportunisticRefs.map((r) => r.number))].sort(byNum);

  // Strict: only a bare integer counts. "13 issues" / "" / absent -> null, which
  // the audit treats as a scope-count-mismatch (an undeclared count is a finding,
  // not a reason to skip the check).
  const rawScopeIssues = (frontmatter.scope_issues ?? '').trim();
  const scopeIssuesDeclared = /^\d+$/.test(rawScopeIssues) ? Number(rawScopeIssues) : null;

  // Strict: `sprint` must be a bare integer. "007foo" would otherwise parseInt to
  // 7 and the audit would happily reconcile against Sprint 7.
  const rawSprint = (frontmatter.sprint ?? '').trim();
  const sprintNumber = /^\d+$/.test(rawSprint) ? Number(rawSprint) : null;

  return {
    sprint: frontmatter.sprint ?? null,
    sprintNumber,
    sprintNumberInvalid: rawSprint !== '' && sprintNumber == null,
    status: frontmatter.status ?? null,
    title: frontmatter.title ?? null,
    started: frontmatter.started || null,
    completed: frontmatter.completed || null,
    scopeIssuesDeclared,
    initialScopeCount,
    formalScopeIssues,
    opportunisticIssues,
    scopeRefs: scopeRefs.sort((a, b) => a.number - b.number),
    opportunisticRefs: opportunisticRefs.sort((a, b) => a.number - b.number),
    executionEvidence,
  };
}

module.exports = {
  parseSprintDoc,
  parseFrontmatter,
  splitTopSections,
  subsectionByNumber,
  issueNumbersFromTableRows,
  issueRefsFromTableRows,
  issueRefsFromBullets,
  scopeRefsFromSection,
  rowIssueRef,
  resolveRepoToken,
};

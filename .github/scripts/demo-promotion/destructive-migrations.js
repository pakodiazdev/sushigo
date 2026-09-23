'use strict';

// Destructive-migration guard for Demo's automated promotion (#635, TD-07 "Migration ownership").
//
// Demo migrates *before* the new revision takes traffic, while the currently-serving revision is
// still querying the same database (`--no-traffic`). A migration that drops, renames or retypes a
// column/table the old revision still reads breaks it immediately, and a later traffic rollback
// cannot undo a schema change. TD-07 therefore makes a release that contains one "not a candidate
// for this automated pipeline" — this module is what detects that.
//
// Only each migration's `up()` body is scanned (every `down()` legitimately drops what `up()`
// created), with comments stripped so prose like "the dropped column" never trips it. Dropping an
// index, foreign key, unique or check constraint is not flagged: the old revision's queries keep
// working without them. Nor is `->nullable()->change()`: relaxing NOT NULL never breaks the old
// revision's reads or writes (tightening a column, e.g. a new `public_id` made NOT NULL, can break
// the old revision's inserts, so every other `->change()` stays flagged).

const DESTRUCTIVE_PATTERNS = [
  { name: 'dropColumn', regex: /->\s*dropColumns?\s*\(/ },
  { name: 'renameColumn', regex: /->\s*renameColumn\s*\(/ },
  { name: 'dropMorphs/dropTimestamps/dropSoftDeletes/dropRememberToken', regex: /->\s*drop(?:Nullable)?(?:Morphs|Timestamps(?:Tz)?|SoftDeletes(?:Tz)?|RememberToken)\s*\(/ },
  // Any column redefinition, except one that only relaxes it to nullable (see SAFE_CHANGE below).
  { name: 'column ->change()', regex: /->\s*change\s*\(\s*\)/, unless: /->\s*nullable\s*\(\s*(?:true)?\s*\)\s*->\s*change\s*\(\s*\)/ },
  { name: 'Schema::drop', regex: /Schema::\s*(?:drop|dropIfExists|dropColumns)\s*\(/ },
  { name: 'Schema::rename', regex: /Schema::\s*rename\s*\(/ },
  { name: 'SQL DROP TABLE/COLUMN', regex: /\bDROP\s+(?:TABLE|COLUMN)\b/i },
  { name: 'SQL RENAME', regex: /\bRENAME\s+(?:TO|COLUMN)\b/i },
  { name: 'SQL ALTER COLUMN ... TYPE', regex: /\bALTER\s+COLUMN\s+\S+\s+(?:SET\s+DATA\s+)?TYPE\b/i },
];

/** Replaces comments with spaces (keeping newlines, so line numbers survive). String contents are kept. */
function stripComments(source) {
  let out = '';
  let i = 0;
  let quote = null;
  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];
    if (quote) {
      out += ch;
      if (ch === '\\') {
        out += next ?? '';
        i += 2;
        continue;
      }
      if (ch === quote) quote = null;
      i += 1;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      out += ch;
      i += 1;
      continue;
    }
    if ((ch === '/' && next === '/') || ch === '#') {
      while (i < source.length && source[i] !== '\n') {
        out += ' ';
        i += 1;
      }
      continue;
    }
    if (ch === '/' && next === '*') {
      while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) {
        out += source[i] === '\n' ? '\n' : ' ';
        i += 1;
      }
      out += '  ';
      i += 2;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

/** Returns { body, startLine } for the `up()` method, or null if the file has none. */
function extractUpBody(source) {
  const match = /function\s+up\s*\([^)]*\)[^{]*\{/.exec(source);
  if (!match) return null;
  const open = match.index + match[0].length - 1;
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        return {
          body: source.slice(open, i + 1),
          startLine: source.slice(0, open).split('\n').length,
        };
      }
    }
  }
  return null;
}

/** @returns {{ operation: string, line: number, text: string }[]} */
function findDestructiveOperations(source) {
  const up = extractUpBody(stripComments(source));
  if (!up) return [];
  const findings = [];
  up.body.split('\n').forEach((text, index) => {
    for (const { name, regex, unless } of DESTRUCTIVE_PATTERNS) {
      if (regex.test(text) && !(unless && unless.test(text))) {
        findings.push({ operation: name, line: up.startLine + index, text: text.trim() });
      }
    }
  });
  return findings;
}

/**
 * @param {{ path: string, source: string }[]} files
 * @returns {{ path: string, operation: string, line: number, text: string }[]}
 */
function scanMigrations(files) {
  return files.flatMap(({ path, source }) =>
    findDestructiveOperations(source).map((finding) => ({ path, ...finding })),
  );
}

module.exports = { findDestructiveOperations, scanMigrations, stripComments, extractUpBody };

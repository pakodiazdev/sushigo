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
//
// Adding a *required* column to an existing table is flagged too: a column added inside
// `Schema::table(...)` with no `->nullable()`, `->default(...)` or `->useCurrent()` either fails
// on existing rows or makes the still-serving old revision's inserts fail. Columns defined inside
// `Schema::create(...)` are not checked — a brand-new table has no old-revision readers or writers.

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

// Blueprint methods that add a column. Helpers that only add nullable columns (`timestamps`,
// `softDeletes`, `nullableMorphs`, `rememberToken`, ...) and index/key helpers are deliberately absent.
const COLUMN_TYPES = [
  'bigIncrements', 'bigInteger', 'binary', 'boolean', 'char', 'date', 'dateTime', 'dateTimeTz',
  'decimal', 'double', 'enum', 'float', 'foreignId', 'foreignIdFor', 'foreignUlid', 'foreignUuid',
  'geography', 'geometry', 'increments', 'integer', 'ipAddress', 'json', 'jsonb', 'longText',
  'macAddress', 'mediumIncrements', 'mediumInteger', 'mediumText', 'morphs', 'set', 'smallIncrements',
  'smallInteger', 'string', 'text', 'time', 'timeTz', 'timestamp', 'timestampTz', 'tinyIncrements',
  'tinyInteger', 'tinyText', 'ulid', 'ulidMorphs', 'unsignedBigInteger', 'unsignedDecimal',
  'unsignedInteger', 'unsignedMediumInteger', 'unsignedSmallInteger', 'unsignedTinyInteger', 'uuid',
  'uuidMorphs', 'vector', 'year',
];
const COLUMN_ADDITION = new RegExp(`\\$\\w+\\s*->\\s*(?:${COLUMN_TYPES.join('|')})\\s*\\(`);
const SAFE_COLUMN_MODIFIER = /->\s*(?:nullable\s*\(\s*(?:true)?\s*\)|default\s*\(|useCurrent\s*\(|change\s*\(|storedAs\s*\(|virtualAs\s*\(|generatedAs\s*\()/;

/** Index of the parenthesis closing the one opened at `open`, skipping string contents. */
function matchingParen(source, open) {
  let depth = 0;
  let quote = null;
  for (let i = open; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (ch === '\\') i += 1;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"') quote = ch;
    else if (ch === '(') depth += 1;
    else if (ch === ')') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return source.length - 1;
}

/** Required (non-null, no-default) columns added inside `Schema::table(...)` calls. */
function findRequiredColumnAdditions(up) {
  const findings = [];
  const call = /Schema::\s*table\s*\(/g;
  let match;
  while ((match = call.exec(up.body)) !== null) {
    const open = match.index + match[0].length - 1;
    const close = matchingParen(up.body, open);
    const block = up.body.slice(open, close + 1);
    let offset = open;
    for (const statement of block.split(';')) {
      const column = COLUMN_ADDITION.exec(statement);
      if (column && !SAFE_COLUMN_MODIFIER.test(statement)) {
        findings.push({
          operation: 'required column added to existing table',
          line: up.startLine + up.body.slice(0, offset + column.index).split('\n').length - 1,
          text: `${statement.slice(column.index).trim().replace(/\s+/g, ' ')};`,
        });
      }
      offset += statement.length + 1;
    }
    call.lastIndex = close;
  }
  return findings;
}

/** @returns {{ operation: string, line: number, text: string }[]} */
function findDestructiveOperations(source) {
  const up = extractUpBody(stripComments(source));
  if (!up) return [];
  const findings = findRequiredColumnAdditions(up);
  up.body.split('\n').forEach((text, index) => {
    for (const { name, regex, unless } of DESTRUCTIVE_PATTERNS) {
      if (regex.test(text) && !(unless && unless.test(text))) {
        findings.push({ operation: name, line: up.startLine + index, text: text.trim() });
      }
    }
  });
  return findings.sort((a, b) => a.line - b.line);
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

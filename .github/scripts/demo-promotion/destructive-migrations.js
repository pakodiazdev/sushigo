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
// created), with comments stripped so prose like "the dropped column" never trips it. Patterns are
// matched per PHP statement (split on `;`), not per physical line, so a fluent chain or a SQL string
// spread over several lines — or concatenated from several string literals — is seen whole. Dropping an
// index, foreign key, unique or check constraint is not flagged: the old revision's queries keep
// working without them. Every `->change()` is flagged, even one that looks like a pure relaxation
// (`->nullable()->change()`): a static scan can't see the column's current type or length, so it
// can't tell `nullable()` from `nullable()` plus a narrowing (e.g. `string('sku', 10)` over a
// 100-character column). A genuinely safe relaxation goes through demo-ops' `advance-watermark`.
//
// Adding a *required* column to an existing table is flagged too: a column added inside
// `Schema::table(...)` with no `->nullable()`, `->default(...)` or `->useCurrent()` either fails
// on existing rows or makes the still-serving old revision's inserts fail. Columns defined inside
// `Schema::create(...)` are not checked — a brand-new table has no old-revision readers or writers.
// The raw-SQL equivalents (`ALTER COLUMN ... SET NOT NULL`, `ADD COLUMN ... NOT NULL` with no
// `DEFAULT`) are flagged for the same reason.

const DESTRUCTIVE_PATTERNS = [
  { name: 'dropColumn', regex: /->\s*dropColumns?\s*\(/ },
  { name: 'renameColumn', regex: /->\s*renameColumn\s*\(/ },
  { name: 'dropMorphs/dropTimestamps/dropSoftDeletes/dropRememberToken', regex: /->\s*drop(?:Nullable)?(?:(?:Uuid|Ulid)?Morphs|Timestamps(?:Tz)?|SoftDeletes(?:Tz)?|RememberToken)\s*\(/ },
  // Drops the foreign key *and* its column (plain `dropForeign`/`dropForeignIdFor` only drop the key).
  { name: 'dropConstrainedForeignId', regex: /->\s*dropConstrainedForeignId(?:For)?\s*\(/ },
  // Any column redefinition — see the header for why nullable() relaxations aren't exempt.
  { name: 'column ->change()', regex: /->\s*change\s*\(\s*\)/ },
  { name: 'Schema::drop', regex: /Schema::\s*(?:drop|dropIfExists|dropColumns)\s*\(/ },
  { name: 'Schema::rename', regex: /Schema::\s*rename\s*\(/ },
  { name: 'SQL DROP TABLE/COLUMN', regex: /\bDROP\s+(?:TABLE|COLUMN)\b/i },
  { name: 'SQL RENAME', regex: /\bRENAME\s+(?:TO|COLUMN)\b/i },
  { name: 'SQL ALTER COLUMN ... TYPE', regex: /\bALTER\s+COLUMN\s+\S+\s+(?:SET\s+DATA\s+)?TYPE\b/i },
  // Raw-SQL forms of tightening a column: the old revision's inserts that leave it NULL start failing.
  { name: 'SQL ALTER COLUMN ... SET NOT NULL', regex: /\bALTER\s+COLUMN\s+\S+\s+SET\s+NOT\s+NULL\b/i },
  // One ADD clause (up to the next top-level comma) declaring NOT NULL with no DEFAULT anywhere in it.
  { name: 'SQL ADD COLUMN ... NOT NULL without DEFAULT', regex: /\bADD\s+(?:COLUMN\s+)?(?:IF\s+NOT\s+EXISTS\s+)?\S+\s+(?:\([^)]*\)|(?!DEFAULT\b)[^,;'"()])*?\bNOT\s+NULL\b(?:\([^)]*\)|(?!DEFAULT\b)[^,;'"()])*(?=[,;'"]|$)/i },
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

/** Blanks the `' . '` joins between concatenated string literals (same length, newlines kept). */
function joinConcatenatedStrings(statement) {
  return statement.replace(/(['"])\s*\.\s*\1/g, (join) => join.replace(/[^\n]/g, ' '));
}

/** @returns {{ operation: string, line: number, text: string }[]} */
function findDestructiveOperations(source) {
  const up = extractUpBody(stripComments(source));
  if (!up) return [];
  const findings = findRequiredColumnAdditions(up);
  let offset = 0;
  for (const raw of up.body.split(';')) {
    const statement = joinConcatenatedStrings(raw);
    for (const { name, regex, unless } of DESTRUCTIVE_PATTERNS) {
      if (unless && unless.test(statement)) continue;
      for (const match of statement.matchAll(new RegExp(regex.source, `${regex.flags}g`))) {
        const lineStart = statement.lastIndexOf('\n', match.index) + 1;
        findings.push({
          operation: name,
          line: up.startLine + up.body.slice(0, offset + match.index).split('\n').length - 1,
          text: `${raw.slice(lineStart).trim().replace(/\s+/g, ' ')};`,
        });
      }
    }
    offset += raw.length + 1;
  }
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

'use strict';

// Destructive-migration detector (#636, TD-07 "Migration ownership").
//
// Production's automated pipeline runs `php artisan migrate --force` while the *old* revision is
// still serving traffic (the new one is deployed with --no-traffic and only promoted after its
// readiness/smoke checks). A migration that drops, renames or retypes something the old revision
// still uses breaks it immediately, and an application rollback cannot undo a schema change. This
// module flags such operations in a migration's up() so the pipeline can refuse to run them
// unattended.
//
// It is a deliberately conservative static heuristic, not a PHP parser: comments are ignored,
// only up() is inspected (drops in down() are the normal inverse of a create), and raw SQL is only
// matched inside string literals. A genuine contract-phase drop (the column has been unused by the
// running release for at least one deploy) can be acknowledged in the migration itself with
//   // migration-guard: allow <reason>
// which keeps it visible in the report but no longer blocking.

const RULES = [
  {
    rule: 'drop-column',
    pattern:
      /->\s*(dropColumn|dropTimestamps(?:Tz)?|dropSoftDeletes(?:Tz)?|dropMorphs|dropRememberToken|dropConstrainedForeignId(?:For)?)\s*\(/g,
  },
  { rule: 'rename-column', pattern: /->\s*renameColumn\s*\(/g },
  { rule: 'column-change', pattern: /->\s*change\s*\(\s*\)/g },
  { rule: 'rename-table', pattern: /\bSchema::rename\s*\(/g },
  { rule: 'drop-table', pattern: /\bSchema::(drop|dropIfExists|dropAllTables|dropAllViews)\s*\(/g },
  { rule: 'data-loss', pattern: /->\s*(truncate|delete|forceDelete)\s*\(/g },
];

// Matched only inside string literals, so PHP identifiers like ->truncate() are not double-counted.
const RAW_SQL =
  /\b(DROP\s+(TABLE|COLUMN|SCHEMA|VIEW|MATERIALIZED\s+VIEW)|RENAME\s+(TO|COLUMN)|TRUNCATE|DELETE\s+FROM|ALTER\s+COLUMN\s+\S+\s+(SET\s+DATA\s+)?TYPE)\b/gi;

const ACK = /migration-guard:\s*allow[ \t]+(\S[^\r\n]*)/;

// `<<<ID`, `<<<"ID"` (heredoc) or `<<<'ID'` (nowdoc), up to the end of the opening line.
const HEREDOC_OPEN = /^<<<[ \t]*(["']?)([A-Za-z_][A-Za-z0-9_]*)\1[ \t]*\r?\n/;

// Returns the offset just past a heredoc/nowdoc's closing identifier, or the end of the source when
// it is unterminated. PHP >= 7.3 allows an indented closer followed by any non-identifier char
// (e.g. `SQL);`), so the closer is the identifier alone at the start of a line (after whitespace).
function heredocEnd(source, bodyStart, id) {
  const closer = new RegExp(`(^|\\n)[ \\t]*${id}(?![A-Za-z0-9_])`, 'g');
  closer.lastIndex = bodyStart;
  const m = closer.exec(source);
  return m ? m.index + m[0].length : source.length;
}

// Walks PHP source once, blanking comments (same length, newlines kept so offsets and line numbers
// still line up) and recording string-literal ranges — quoted strings and heredoc/nowdoc bodies
// alike, since raw SQL is routinely written as `DB::statement(<<<'SQL' … SQL)` in this codebase.
function tokenize(source) {
  const out = source.split('');
  const strings = [];
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];
    const heredoc = ch === '<' ? HEREDOC_OPEN.exec(source.slice(i, i + 256)) : null;
    if (heredoc) {
      const end = heredocEnd(source, i + heredoc[0].length, heredoc[2]);
      strings.push([i, end]);
      i = end;
    } else if (ch === "'" || ch === '"') {
      const start = i;
      i += 1;
      while (i < source.length && source[i] !== ch) {
        i += source[i] === '\\' ? 2 : 1;
      }
      strings.push([start, Math.min(i + 1, source.length)]);
      i += 1;
    } else if ((ch === '/' && next === '/') || ch === '#') {
      while (i < source.length && source[i] !== '\n') {
        out[i] = ' ';
        i += 1;
      }
    } else if (ch === '/' && next === '*') {
      while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) {
        if (source[i] !== '\n') out[i] = ' ';
        i += 1;
      }
      if (i < source.length) {
        out[i] = ' ';
        out[i + 1] = ' ';
      }
      i += 2;
    } else {
      i += 1;
    }
  }
  return { code: out.join(''), strings };
}

function stripComments(source) {
  return tokenize(source).code;
}

// Returns { start, end, text } for the body of `function up(...)`, or null if there is none.
function extractUpBody(code) {
  const header = /function\s+up\s*\([^)]*\)\s*(?::\s*\??\w+)?\s*\{/.exec(code);
  if (!header) return null;
  const start = header.index + header[0].length;
  const { strings } = tokenize(code);
  let depth = 1;
  let i = start;
  while (i < code.length && depth > 0) {
    const inString = strings.find(([s, e]) => i >= s && i < e);
    if (inString) {
      i = inString[1];
      continue;
    }
    if (code[i] === '{') depth += 1;
    if (code[i] === '}') depth -= 1;
    i += 1;
  }
  const end = depth === 0 ? i - 1 : code.length;
  return { start, end, text: code.slice(start, end) };
}

function lineAt(source, offset) {
  return source.slice(0, offset).split('\n').length;
}

function findDestructiveOperations(source) {
  const { code, strings } = tokenize(source);
  const body = extractUpBody(code) || { start: 0, end: code.length, text: code };
  const lines = source.split('\n');
  const hits = [];

  for (const { rule, pattern } of RULES) {
    pattern.lastIndex = 0;
    let m;
    while ((m = pattern.exec(body.text)) !== null) {
      hits.push({ rule, offset: body.start + m.index });
    }
  }

  for (const [s, e] of strings) {
    if (s < body.start || e > body.end) continue;
    RAW_SQL.lastIndex = 0;
    if (RAW_SQL.exec(source.slice(s, e)) !== null) {
      hits.push({ rule: 'raw-sql', offset: s });
    }
  }

  return hits
    .sort((a, b) => a.offset - b.offset)
    .map(({ rule, offset }) => {
      const line = lineAt(source, offset);
      return { rule, line, snippet: lines[line - 1].trim() };
    });
}

function acknowledgement(source) {
  const m = ACK.exec(source);
  if (!m) return null;
  const reason = m[1].trim();
  return reason === '' ? null : reason;
}

function scanMigration(path, source) {
  const findings = findDestructiveOperations(source);
  const acknowledged = findings.length > 0 ? acknowledgement(source) : null;
  return { path, findings, acknowledged, blocking: findings.length > 0 && acknowledged === null };
}

function isMigrationPath(path) {
  return /^code\/api\/database\/migrations\/[^/]+\.php$/.test(path);
}

module.exports = {
  stripComments,
  extractUpBody,
  findDestructiveOperations,
  acknowledgement,
  scanMigration,
  isMigrationPath,
};

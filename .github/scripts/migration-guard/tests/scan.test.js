'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  stripComments,
  extractUpBody,
  findDestructiveOperations,
  acknowledgement,
  scanMigration,
  isMigrationPath,
} = require('../scan.js');

const migration = (up, down = '', header = '') => `<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\DB;
use Illuminate\\Support\\Facades\\Schema;
${header}
return new class extends Migration
{
    public function up(): void
    {
${up}
    }

    public function down(): void
    {
${down}
    }
};
`;

const rules = (source) => findDestructiveOperations(source).map((f) => f.rule);

test('stripComments blanks // # and /* */ comments but keeps strings and line numbers', () => {
  const src = "a(); // drop\n$x = 'http://x'; # note\n/* multi\nline */ b(\"#not\");";
  const out = stripComments(src);
  assert.equal(out.length, src.length);
  assert.equal(out.split('\n').length, src.split('\n').length);
  assert.ok(!out.includes('drop'));
  assert.ok(!out.includes('note'));
  assert.ok(!out.includes('multi'));
  assert.ok(out.includes("'http://x'"));
  assert.ok(out.includes('"#not"'));
});

test('extractUpBody returns only the up() body, ignoring braces inside strings', () => {
  const src = migration("        DB::statement('SELECT \"{\"');\n        Schema::table('a', function () {});", '        Schema::dropIfExists(\'a\');');
  const body = extractUpBody(stripComments(src));
  assert.ok(body.text.includes('Schema::table'));
  assert.ok(!body.text.includes('dropIfExists'));
});

test('extractUpBody returns null when there is no up() method', () => {
  assert.equal(extractUpBody('<?php return 1;'), null);
});

test('a purely additive migration has no findings', () => {
  const src = migration(
    "        Schema::create('dishes', function (Blueprint $table) {\n            $table->id();\n            $table->string('name');\n        });",
    "        Schema::dropIfExists('dishes');",
  );
  assert.deepEqual(rules(src), []);
});

test('drop operations in down() are ignored', () => {
  const src = migration(
    "        Schema::table('users', fn (Blueprint $t) => $t->string('phone')->nullable());",
    "        Schema::table('users', fn (Blueprint $t) => $t->dropColumn('phone'));",
  );
  assert.deepEqual(rules(src), []);
});

test('flags column drops, including the Blueprint helper variants', () => {
  const src = migration([
    "        Schema::table('a', function (Blueprint $table) {",
    "            $table->dropColumn(['x', 'y']);",
    '            $table->dropTimestamps();',
    '            $table->dropSoftDeletes();',
    "            $table->dropMorphs('owner');",
    '            $table->dropRememberToken();',
    "            $table->dropConstrainedForeignId('branch_id');",
    '        });',
  ].join('\n'));
  assert.deepEqual(rules(src), Array(6).fill('drop-column'));
});

test('flags renames, table drops, column type changes and truncation', () => {
  const src = migration([
    "        Schema::table('a', function (Blueprint $table) {",
    "            $table->renameColumn('old', 'new');",
    "            $table->string('code', 10)->change();",
    '        });',
    "        Schema::rename('a', 'b');",
    "        Schema::drop('c');",
    "        Schema::dropIfExists('d');",
    "        DB::table('e')->truncate();",
    "        DB::table('f')->where('x', 1)->delete();",
  ].join('\n'));
  assert.deepEqual(rules(src), [
    'rename-column',
    'column-change',
    'rename-table',
    'drop-table',
    'drop-table',
    'data-loss',
    'data-loss',
  ]);
});

test('flags destructive raw SQL but not constraint/index maintenance', () => {
  const src = migration([
    "        DB::statement('ALTER TABLE a DROP CONSTRAINT a_type_check');",
    "        DB::statement('DROP INDEX IF EXISTS a_code_unique');",
    "        DB::statement('ALTER TABLE a DROP COLUMN legacy');",
    "        DB::statement('ALTER TABLE a RENAME COLUMN x TO y');",
    '        DB::statement("ALTER TABLE a ALTER COLUMN amount TYPE numeric(15,4)");',
    "        DB::unprepared('TRUNCATE b');",
  ].join('\n'));
  assert.deepEqual(rules(src), ['raw-sql', 'raw-sql', 'raw-sql', 'raw-sql']);
});

test('reports 1-based line numbers pointing at the offending statement', () => {
  const src = migration("        Schema::table('a', fn (Blueprint $t) => $t->dropColumn('x'));");
  const [finding] = findDestructiveOperations(src);
  const lines = src.split('\n');
  assert.ok(lines[finding.line - 1].includes("dropColumn('x')"));
  assert.ok(finding.snippet.includes("dropColumn('x')"));
});

test('commented-out destructive code is not flagged', () => {
  const src = migration("        // $table->dropColumn('x');\n        /* Schema::drop('y'); */");
  assert.deepEqual(rules(src), []);
});

test('acknowledgement reads an explicit contract-phase marker with its reason', () => {
  const src = migration(
    "        Schema::table('a', fn (Blueprint $t) => $t->dropColumn('x'));",
    '',
    '// migration-guard: allow column x unused since release abc123 (contract phase)\n',
  );
  assert.equal(acknowledgement(src), 'column x unused since release abc123 (contract phase)');
  assert.equal(acknowledgement(migration('')), null);
});

test('an acknowledgement marker without a reason does not count', () => {
  assert.equal(acknowledgement('// migration-guard: allow   \n'), null);
});

test('scanMigration combines findings and acknowledgement', () => {
  const src = migration("        Schema::dropIfExists('legacy');");
  const result = scanMigration('code/api/database/migrations/2026_01_01_000000_x.php', src);
  assert.equal(result.path, 'code/api/database/migrations/2026_01_01_000000_x.php');
  assert.equal(result.findings.length, 1);
  assert.equal(result.acknowledged, null);
  assert.equal(result.blocking, true);

  const acked = scanMigration('x.php', `// migration-guard: allow table retired in #999\n${src}`);
  assert.equal(acked.blocking, false);
});

test('files without an up() method are scanned whole', () => {
  assert.deepEqual(rules("<?php\nSchema::drop('x');\n"), ['drop-table']);
});

test('isMigrationPath matches only PHP files under the API migrations directory', () => {
  assert.equal(isMigrationPath('code/api/database/migrations/2026_01_01_000000_a.php'), true);
  assert.equal(isMigrationPath('code/api/database/migrations/README.md'), false);
  assert.equal(isMigrationPath('code/api/database/seeders/X.php'), false);
});

test('the real legacy cost/price drop migration is flagged', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const file = path.resolve(
    __dirname,
    '../../../../code/api/database/migrations/2026_08_27_210000_drop_legacy_cost_and_price_columns_from_item_variants.php',
  );
  const result = scanMigration(file, fs.readFileSync(file, 'utf8'));
  assert.ok(result.findings.some((f) => f.rule === 'drop-column'));
  assert.equal(result.blocking, true);
});

test('flags destructive SQL inside a nowdoc (Codex P1 on #663)', () => {
  const src = migration([
    "        DB::statement(<<<'SQL'",
    '            ALTER TABLE stock DROP COLUMN legacy_value',
    '            SQL);',
  ].join('\n'));
  const findings = findDestructiveOperations(src);
  assert.deepEqual(findings.map((f) => f.rule), ['raw-sql']);
  assert.ok(findings[0].snippet.includes("<<<'SQL'"));
});

test('flags destructive SQL inside a heredoc, quoted or bare identifier', () => {
  for (const opener of ['<<<SQL', '<<<"SQL"', '<<< SQL']) {
    const src = migration([
      `        DB::unprepared(${opener}`,
      '        TRUNCATE audit_logs;',
      'SQL',
      '        );',
    ].join('\n'));
    assert.deepEqual(rules(src), ['raw-sql'], opener);
  }
});

test('non-destructive heredoc SQL is not flagged', () => {
  const src = migration([
    "        DB::statement(<<<'SQL'",
    '            UPDATE stock SET total_value = 0 -- no drop here',
    '            SQL);',
  ].join('\n'));
  assert.deepEqual(rules(src), []);
});

test("quotes, # and // inside a heredoc don't derail the rest of the scan", () => {
  const src = migration([
    "        DB::statement(<<<'SQL'",
    "            UPDATE items SET note = 'it''s # not a comment // either'",
    '            SQL);',
    "        Schema::table('a', fn (Blueprint $t) => $t->dropColumn('x'));",
  ].join('\n'));
  assert.deepEqual(rules(src), ['drop-column']);
});

test('a heredoc closing identifier must match the opener, not a prefix of a longer word', () => {
  const src = migration([
    "        DB::statement(<<<'SQL'",
    '            SQLITE_NOTE is not the terminator',
    '            DROP TABLE legacy',
    '            SQL);',
  ].join('\n'));
  assert.deepEqual(rules(src), ['raw-sql']);
});

test('drop statements inside a heredoc in down() are ignored', () => {
  const src = migration(
    "        Schema::create('t', fn (Blueprint $t) => $t->id());",
    "        DB::statement(<<<'SQL'\n            DROP TABLE t\n            SQL);",
  );
  assert.deepEqual(rules(src), []);
});

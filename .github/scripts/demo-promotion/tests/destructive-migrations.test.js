'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { findDestructiveOperations, scanMigrations } = require('../destructive-migrations.js');

const migration = (up, down = "Schema::dropIfExists('things');") => `<?php

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

const operations = (source) => findDestructiveOperations(source).map((f) => f.operation);

test('an additive migration is safe, even though down() drops everything', () => {
  const source = migration(`        Schema::create('things', function (Blueprint $table) {
            $table->id();
            $table->string('name')->nullable();
        });`);
  assert.deepEqual(findDestructiveOperations(source), []);
});

test('flags dropping and renaming columns inside up()', () => {
  const source = migration(`        Schema::table('items', function (Blueprint $table) {
            $table->dropColumn(['cost', 'price']);
            $table->renameColumn('sku', 'code');
        });`);
  assert.deepEqual(operations(source), ['dropColumn', 'renameColumn']);
});

test('flags dropping or renaming tables', () => {
  assert.deepEqual(operations(migration("        Schema::dropIfExists('legacy');")), ['Schema::drop']);
  assert.deepEqual(operations(migration("        Schema::rename('old', 'new');")), ['Schema::rename']);
});

test('flags column type changes via ->change()', () => {
  const source = migration(`        Schema::table('stock', fn (Blueprint $t) => $t->decimal('qty', 20, 6)->change());`);
  assert.deepEqual(operations(source), ['column ->change()']);
});

test('every column redefinition is flagged, nullable() relaxations included', () => {
  assert.deepEqual(operations(migration("        Schema::table('items', fn (Blueprint $t) => $t->string('sku')->nullable()->change());")), ['column ->change()']);
  // nullable() can hide a narrowing the scan can't see (the column's current length is unknown here).
  assert.deepEqual(operations(migration("        Schema::table('items', fn (Blueprint $t) => $t->string('sku', 10)->nullable()->change());")), ['column ->change()']);
  assert.deepEqual(operations(migration("        Schema::table('items', fn (Blueprint $t) => $t->ulid('public_id')->nullable(false)->change());")), ['column ->change()']);
});

test('flags destructive raw SQL, case-insensitively', () => {
  assert.deepEqual(operations(migration("        DB::statement('alter table items drop column cost');")), ['SQL DROP TABLE/COLUMN']);
  assert.deepEqual(operations(migration("        DB::statement('ALTER TABLE items RENAME COLUMN a TO b');")), ['SQL RENAME']);
  assert.deepEqual(operations(migration("        DB::statement('ALTER TABLE items ALTER COLUMN qty TYPE numeric(20,6)');")), ['SQL ALTER COLUMN ... TYPE']);
});

test('flags raw SQL that tightens a column to NOT NULL', () => {
  assert.deepEqual(
    operations(migration("        DB::statement('ALTER TABLE stock_movement_lines ALTER COLUMN base_qty SET NOT NULL');")),
    ['SQL ALTER COLUMN ... SET NOT NULL'],
  );
  assert.deepEqual(
    operations(migration("        DB::statement('alter table items add column code varchar(20) not null');")),
    ['SQL ADD COLUMN ... NOT NULL without DEFAULT'],
  );
});

test('raw SQL that relaxes a column or adds one with a default is safe', () => {
  assert.deepEqual(operations(migration("        DB::statement('ALTER TABLE items ALTER COLUMN code DROP NOT NULL');")), []);
  assert.deepEqual(operations(migration("        DB::statement('ALTER TABLE items ADD COLUMN active boolean NOT NULL DEFAULT true');")), []);
  assert.deepEqual(operations(migration("        DB::statement('ALTER TABLE items ADD CONSTRAINT items_code_unique UNIQUE (code)');")), []);
});

test('flags NOT NULL tightening split across lines or concatenated strings', () => {
  const multiline = migration(`        DB::statement('
            ALTER TABLE stock_movement_lines
            ALTER COLUMN base_qty
            SET NOT NULL
        ');`);
  assert.deepEqual(operations(multiline), ['SQL ALTER COLUMN ... SET NOT NULL']);
  const concatenated = migration(`        DB::statement('ALTER TABLE items ALTER COLUMN code '
            . 'SET NOT NULL');`);
  assert.deepEqual(operations(concatenated), ['SQL ALTER COLUMN ... SET NOT NULL']);
});

test('judges each ADD clause of a raw ALTER TABLE on its own', () => {
  assert.deepEqual(
    operations(migration("        DB::statement('ALTER TABLE items ADD COLUMN qty numeric(20,6) NOT NULL, ADD COLUMN active boolean NOT NULL DEFAULT true');")),
    ['SQL ADD COLUMN ... NOT NULL without DEFAULT'],
  );
  assert.deepEqual(operations(migration("        DB::statement('ALTER TABLE items ADD COLUMN qty numeric(20,6) DEFAULT 0 NOT NULL');")), []);
});

test('flags helpers that drop a foreign key together with its column', () => {
  assert.deepEqual(
    operations(migration("        Schema::table('items', fn (Blueprint $t) => $t->dropConstrainedForeignId('brand_id'));")),
    ['dropConstrainedForeignId'],
  );
  assert.deepEqual(
    operations(migration("        Schema::table('items', fn (Blueprint $t) => $t->dropConstrainedForeignIdFor(Brand::class));")),
    ['dropConstrainedForeignId'],
  );
  assert.deepEqual(operations(migration("        Schema::table('items', fn (Blueprint $t) => $t->dropForeignIdFor(Brand::class));")), []);
});

test('flags a change() chain spread over several lines once, on the change() line', () => {
  const source = migration(`        Schema::table('items', function (Blueprint $table) {
            $table->string('sku', 100)
                ->nullable()
                ->comment('Stock Keeping Unit code')
                ->change();
        });`);
  const findings = findDestructiveOperations(source);
  assert.deepEqual(findings.map((f) => f.operation), ['column ->change()']);
  assert.equal(findings[0].line, 11);
});

test('dropping indexes, foreign keys and constraints is not destructive', () => {
  const source = migration(`        DB::statement('ALTER TABLE lines DROP CONSTRAINT IF EXISTS lines_qty_check');
        Schema::table('lines', function (Blueprint $table) {
            $table->dropIndex(['item_variant_id']);
            $table->dropForeign(['item_variant_id']);
            $table->dropUnique(['code']);
        });`);
  assert.deepEqual(findDestructiveOperations(source), []);
});

test('ignores destructive words that only appear in comments', () => {
  const source = migration(`        // we used to dropColumn('cost') here — see #432
        /* Schema::dropIfExists('legacy'); kept for history */
        # DROP TABLE legacy
        Schema::table('items', fn (Blueprint $t) => $t->string('note')->nullable());`);
  assert.deepEqual(findDestructiveOperations(source), []);
});

test('keeps string contents that look like comments', () => {
  const source = migration("        DB::statement('-- not a php comment; DROP TABLE legacy');");
  assert.deepEqual(operations(source), ['SQL DROP TABLE/COLUMN']);
});

test('reports the real line number of each finding', () => {
  const source = migration(`        Schema::table('items', function (Blueprint $table) {
            $table->dropColumn('cost');
        });`);
  const [finding] = findDestructiveOperations(source);
  assert.equal(finding.line, 8);
  assert.equal(finding.text, "$table->dropColumn('cost');");
});

test('flags a required column added to an existing table', () => {
  const closure = migration(`        Schema::table('users', function (Blueprint $table) {
            $table->string('required_code');
        });`);
  assert.deepEqual(operations(closure), ['required column added to existing table']);

  const arrow = migration("        Schema::table('users', fn (Blueprint $t) => $t->foreignId('branch_id')->constrained());");
  assert.deepEqual(operations(arrow), ['required column added to existing table']);
});

test('reports the required column on its own line, even when the chain spans lines', () => {
  const source = migration(`        Schema::table('users', function (Blueprint $table) {
            $table->string('note')->nullable();
            $table->unsignedInteger('level')
                ->comment('seniority');
        });`);
  const [finding] = findDestructiveOperations(source);
  assert.equal(finding.operation, 'required column added to existing table');
  assert.equal(finding.line, 9);
  assert.equal(finding.text, "$table->unsignedInteger('level') ->comment('seniority');");
});

test('nullable, defaulted or current-timestamp columns on existing tables are safe', () => {
  const source = migration(`        Schema::table('users', function (Blueprint $table) {
            $table->string('nickname')->nullable();
            $table->boolean('is_demo')->default(false);
            $table->timestamp('seen_at')->useCurrent();
            $table->foreignId('branch_id')->nullable()->constrained();
            $table->timestamps();
            $table->softDeletes();
            $table->index('nickname');
        });`);
  assert.deepEqual(findDestructiveOperations(source), []);
});

test('required columns inside Schema::create are fine — a new table has no old readers', () => {
  const source = migration(`        Schema::create('things', function (Blueprint $table) {
            $table->id();
            $table->string('name');
        });
        Schema::table('users', fn (Blueprint $t) => $t->string('alias')->nullable());`);
  assert.deepEqual(findDestructiveOperations(source), []);
});

test('nullable(false) does not make an added column safe', () => {
  const source = migration("        Schema::table('users', fn (Blueprint $t) => $t->string('code')->nullable(false));");
  assert.deepEqual(operations(source), ['required column added to existing table']);
});

test('a file without an up() method has nothing to flag', () => {
  assert.deepEqual(findDestructiveOperations('<?php // helper'), []);
});

test('scanMigrations attaches the path to every finding', () => {
  const findings = scanMigrations([
    { path: 'a.php', source: migration("        Schema::drop('x');") },
    { path: 'b.php', source: migration("        Schema::create('y', fn ($t) => $t->id());") },
  ]);
  assert.deepEqual(findings.map((f) => [f.path, f.operation]), [['a.php', 'Schema::drop']]);
});

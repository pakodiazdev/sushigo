<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Additive/compatible only: existing rows keep their sku, the unique
     * index is untouched (Postgres treats multiple NULLs as distinct under
     * a unique index), and every current reader/writer of Item.sku keeps
     * working. New Product writes simply stop populating it — see
     * doc/decisions/td-03-product-catalog-separation.md.
     */
    public function up(): void
    {
        Schema::table('items', function (Blueprint $table) {
            // ->change() re-issues the column comment unconditionally, so it
            // must be redeclared here or Postgres drops it (COMMENT ON COLUMN
            // ... IS NULL) even though we never touched the comment itself.
            $table->string('sku', 100)->nullable()->comment('Stock Keeping Unit code')->change();
        });
    }

    public function down(): void
    {
        // Backfill deterministic, unique placeholder SKUs for rows created
        // after this migration (Products never populate sku) so the
        // subsequent NOT NULL change doesn't fail on Postgres. A single UPDATE
        // (not chunked ->each()/->chunk() offset pagination) is required:
        // chunking while updating the very rows the WHERE clause matches
        // shifts the result window and silently skips rows, which would then
        // make the NOT NULL change below fail deterministically on every
        // retry, leaving this migration permanently unrollbackable.
        DB::table('items')->whereNull('sku')->update(['sku' => DB::raw("'LEGACY-' || id")]);

        Schema::table('items', function (Blueprint $table) {
            $table->string('sku', 100)->nullable(false)->comment('Stock Keeping Unit code')->change();
        });
    }
};

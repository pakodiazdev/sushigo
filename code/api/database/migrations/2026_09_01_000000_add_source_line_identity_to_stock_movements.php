<?php

use App\Models\Receipt;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * #567 — Centralize idempotent Inventory entry posting.
 *
 * Adds explicit per-source-line identity to stock_movements so every inbound
 * writer (Purchase Receipts, Opening Balances, future imports/returns) posts
 * through one primitive with a database-backed idempotency contract instead of
 * hiding the source line inside `meta`:
 *
 *  - `related_line_id` — the source document's line key, alongside the existing
 *    `related_type` / `related_id` pair. Nullable: manual movements
 *    (adjustments, opening balances with no source document) carry no line.
 *  - A partial UNIQUE index over
 *    (related_type, related_id, related_line_id, reason) restricted to live
 *    POSTED rows with a non-null line — the final backstop that stops a queue
 *    retry, an import replay, or a concurrent double-post from incrementing
 *    Stock twice for the same source line. `reason` is part of the key so a
 *    compensating PURCHASE_RECEIPT_REVERSAL sharing the same document line does
 *    not collide with its PURCHASE_RECEIPT original.
 *
 * Existing Receipt movements already recorded the line in
 * `meta->receipt_line_id`; this migration backfills `related_line_id` from it
 * (non-destructively — `meta` is left intact) so their reversal stays causally
 * linked once ReceiptService looks the original up by column instead of meta.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stock_movements', function (Blueprint $table) {
            $table->unsignedBigInteger('related_line_id')
                ->nullable()
                ->after('related_id')
                ->comment('Source document line key (#567) — pairs with related_type/related_id');

            $table->index(['related_type', 'related_id', 'related_line_id'], 'stock_movements_source_line_index');
        });

        // Backfill existing Purchase Receipt movements from the line key they
        // previously only carried in meta, so a not-yet-reversed posted receipt
        // stays reversible after the lookup switches to the column.
        DB::table('stock_movements')
            ->where('related_type', Receipt::class)
            ->whereNull('related_line_id')
            ->whereRaw("meta->>'receipt_line_id' IS NOT NULL")
            ->update(['related_line_id' => DB::raw("(meta->>'receipt_line_id')::bigint")]);

        // Final idempotency backstop: one live posted movement per source line
        // per reason. Partial so null-line manual movements are never
        // constrained. related_type / related_id are also required non-null:
        // a partial identity (line set, parent null) can't be a uniqueness key
        // anyway — NULLs don't collide — so it's excluded explicitly rather
        // than silently half-covered. The DTO rejects a partial triple before
        // it can reach here.
        DB::statement(
            'CREATE UNIQUE INDEX stock_movements_source_line_unique '
            .'ON stock_movements (related_type, related_id, related_line_id, reason) '
            .'WHERE related_line_id IS NOT NULL '
            .'AND related_type IS NOT NULL '
            .'AND related_id IS NOT NULL '
            ."AND status = 'POSTED'"
        );
    }

    public function down(): void
    {
        $this->restoreReceiptLineKeyToMeta();

        DB::statement('DROP INDEX IF EXISTS stock_movements_source_line_unique');

        Schema::table('stock_movements', function (Blueprint $table) {
            $table->dropIndex('stock_movements_source_line_index');
            $table->dropColumn('related_line_id');
        });
    }

    /**
     * Mirror the up() backfill in reverse before the column is dropped: put the
     * line key back into meta.receipt_line_id for every Receipt movement that
     * recorded it only in related_line_id (i.e. posted under this schema by the
     * #567 code). Without this, a paired code rollback — pre-#567 ReceiptService
     * resolves the movement it must reverse via meta->receipt_line_id — would be
     * unable to reverse any receipt posted while this migration was live.
     *
     * Raw writes: the model layer freezes POSTED movements against edits.
     */
    private function restoreReceiptLineKeyToMeta(): void
    {
        DB::table('stock_movements')
            ->where('related_type', Receipt::class)
            ->whereNotNull('related_line_id')
            ->orderBy('id')
            ->get(['id', 'related_line_id', 'meta'])
            ->each(function (object $row): void {
                $meta = json_decode($row->meta ?? '{}', true);
                $meta = is_array($meta) ? $meta : [];

                if (array_key_exists('receipt_line_id', $meta)) {
                    return;
                }

                $meta['receipt_line_id'] = (int) $row->related_line_id;

                DB::table('stock_movements')
                    ->where('id', $row->id)
                    ->update(['meta' => json_encode($meta)]);
            });
    }
};

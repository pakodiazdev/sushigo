<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * No seeder in this codebase ever creates an Item(type=PRODUCTO) row —
     * see doc/architecture/product-catalog/product-catalog-architecture.en.md
     * §9.5 — so any such row that predates the previous migration's
     * brand_id/inventory_category_id columns is legacy test/dev data, not
     * something worth backfilling a real category onto (see PR #467's
     * Needs Human Judgment: "no production data" was the explicit call to
     * delete rather than reconcile). Rows with variants are left alone —
     * a Product with real variant data is not something to blanket-delete
     * even under that same call, and item_variants.item_id has no ON
     * DELETE CASCADE, so deleting them here would fail anyway.
     */
    public function up(): void
    {
        $orphanItemIds = DB::table('items')
            ->where('type', 'PRODUCTO')
            ->whereNull('inventory_category_id')
            ->whereNotIn('id', function ($query) {
                $query->select('item_id')->from('item_variants');
            })
            ->pluck('id');

        if ($orphanItemIds->isEmpty()) {
            return;
        }

        // media_attachments is polymorphic with no FK to items, so a plain
        // DB::table('items')->delete() would leave those rows dangling —
        // permanently invisible to Item's own relations, and (since a
        // gallery only counts as orphaned once it has zero attachments)
        // permanently invisible to `media:cleanup-orphans` too, stranding
        // the gallery/asset/file it points at forever. Deleting the
        // attachment rows first lets that existing scheduled command pick
        // the now-genuinely-orphaned gallery up normally.
        DB::table('media_attachments')
            ->where('attachable_type', 'App\\Models\\Item')
            ->whereIn('attachable_id', $orphanItemIds)
            ->delete();

        DB::table('items')->whereIn('id', $orphanItemIds)->delete();
    }

    /**
     * Data cleanup — nothing to reverse.
     */
    public function down(): void
    {
        //
    }
};

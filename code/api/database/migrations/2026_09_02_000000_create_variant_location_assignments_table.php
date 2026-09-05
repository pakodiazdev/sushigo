<?php

use App\Services\Inventory\VariantLocationAssignmentBackfill;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * #569 — the managed assortment per Inventory Location becomes its own source
 * of truth.
 *
 * `variant_location_assignments` states "this Variant is managed at this
 * Location" independently of its physical `stock` balance and independently of
 * any optional `variant_location_replenishment_policy`. It never carries a
 * quantity or a cost. `Stock` stays lazily created by the first posted
 * movement; a replenishment policy stays optional configuration; neither is
 * renamed or overloaded here.
 *
 * On `up()` the table is backfilled (see VariantLocationAssignmentBackfill)
 * from the distinct union of existing `stock` pairs and live replenishment
 * policy pairs, so no currently-managed Variant disappears from reads that
 * start from assignment. The backfill is idempotent; `down()` dropping the
 * table is its full reversal.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('variant_location_assignments', function (Blueprint $table) {
            $table->id();
            $table->char('public_id', 26)->unique();

            $table->foreignId('inventory_location_id')
                ->constrained('inventory_locations')
                ->cascadeOnDelete()
                ->comment('The Inventory Location this Variant is managed at');

            $table->foreignId('item_variant_id')
                ->constrained('item_variants')
                ->cascadeOnDelete()
                ->comment('The Variant that is managed at this Location');

            $table->timestamps();
            $table->softDeletes();

            $table->index(['inventory_location_id', 'item_variant_id']);
            $table->index('item_variant_id');
        });

        // One live assignment per (location, variant) — a soft-deleted former
        // assignment must not block a fresh one, so historical reactivation
        // stays possible (same pattern as vlrp_one_policy_per_pair in #439).
        DB::statement('create unique index vla_one_assignment_per_pair on variant_location_assignments (inventory_location_id, item_variant_id) where deleted_at is null');

        (new VariantLocationAssignmentBackfill)->run();
    }

    public function down(): void
    {
        Schema::dropIfExists('variant_location_assignments');
    }
};

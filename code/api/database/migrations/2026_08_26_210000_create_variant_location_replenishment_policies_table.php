<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * #439 — replenishment thresholds move off the global ItemVariant and onto
 * the (Inventory Location, Variant) pair. This table holds one policy row per
 * pair; resolution against it (see ReplenishmentPolicyResolver) is the single
 * source of truth for low-stock evaluation, stock summaries, and the
 * management UI from this release on.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('variant_location_replenishment_policies', function (Blueprint $table) {
            $table->id();
            $table->char('public_id', 26)->unique();

            $table->foreignId('inventory_location_id')
                ->constrained('inventory_locations')
                ->cascadeOnDelete()
                ->comment('The Inventory Location this replenishment policy applies at');

            $table->foreignId('item_variant_id')
                ->constrained('item_variants')
                ->cascadeOnDelete()
                ->comment('The Variant this replenishment policy is for');

            $table->decimal('min_stock', 15, 4)->default(0)->comment('Reorder point — on_hand at or below this is "low" at this location');
            $table->decimal('max_stock', 15, 4)->default(0)->comment('Target ceiling used to size replenishment at this location');
            $table->text('notes')->nullable()->comment('Free-text operational note for this pair');
            $table->json('meta')->nullable()->comment('Additional metadata');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['inventory_location_id', 'item_variant_id']);
            $table->index('item_variant_id');
        });

        // One live policy per (location, variant) — a soft-deleted former policy
        // must not block a fresh one (same reasoning as
        // variant_purchase_presentations_unique_pair in #425).
        DB::statement('create unique index vlrp_one_policy_per_pair on variant_location_replenishment_policies (inventory_location_id, item_variant_id) where deleted_at is null');

        // A policy whose ceiling sits below its reorder point is nonsensical —
        // reject it at the DB the same way stock balance invariants are enforced
        // (#436). NOT VALID + VALIDATE keeps the add cheap on a populated table.
        DB::statement('ALTER TABLE variant_location_replenishment_policies ADD CONSTRAINT vlrp_max_gte_min CHECK (max_stock >= min_stock) NOT VALID');
        DB::statement('ALTER TABLE variant_location_replenishment_policies VALIDATE CONSTRAINT vlrp_max_gte_min');
    }

    public function down(): void
    {
        Schema::dropIfExists('variant_location_replenishment_policies');
    }
};

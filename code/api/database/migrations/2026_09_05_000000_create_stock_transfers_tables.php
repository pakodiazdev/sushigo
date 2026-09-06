<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * #573 — Auditable internal Stock Transfers.
 *
 * A Transfer is a draft business document that moves managed Variants between
 * two Inventory Locations. It has its own `DRAFT -> POSTED -> REVERSED`
 * lifecycle; posting decrements source Stock, increments/creates destination
 * Stock, and appends one immutable `TRANSFER` `StockMovement` per line linked to
 * the Transfer and its line via `related_type`/`related_id`/`related_line_id`
 * (the #567 source-line identity contract). Reversal reuses the shared
 * `StockMovementReverser` compensating-movement workflow (#438) — a `TRANSFER`
 * movement already carries both endpoints, so no new movement reason is needed.
 *
 * What this migration adds:
 *  - `stock_transfers` — the document header: public ULID, source/destination,
 *    lifecycle/audit columns, a DB-level distinct-endpoints CHECK.
 *  - `stock_transfer_lines` — one row per moved Variant, snapshotting the entry
 *    UOM, entry quantity, conversion factor, base quantity, and the source
 *    weighted-average cost used at posting. `UNIQUE(stock_transfer_id,
 *    item_variant_id)` is the document-line uniqueness rule — a Variant appears
 *    at most once per Transfer, preserving one physical balance per
 *    Location + Variant.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_transfers', function (Blueprint $table) {
            $table->id();
            $table->char('public_id', 26)->unique();

            $table->foreignId('source_location_id')
                ->constrained('inventory_locations')
                ->cascadeOnDelete()
                ->comment('Location stock is moved out of');

            $table->foreignId('destination_location_id')
                ->constrained('inventory_locations')
                ->cascadeOnDelete()
                ->comment('Location stock is moved into');

            $table->string('reference', 255)->nullable()->comment('Optional external reference');
            $table->date('transfer_date')->comment('Business date the transfer applies to');

            $table->enum('status', ['DRAFT', 'POSTED', 'REVERSED'])
                ->default('DRAFT')
                ->comment('Document lifecycle state');

            $table->text('notes')->nullable();

            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('posted_at')->nullable();
            $table->foreignId('posted_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reversed_at')->nullable();
            $table->foreignId('reversed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('reversal_reason')->nullable();

            $table->json('meta')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'transfer_date']);
            $table->index('source_location_id');
            $table->index('destination_location_id');
        });

        // Source and destination must differ — a structural net under the
        // FormRequest/Service checks, mirroring stock_movements' own
        // distinct-endpoints invariant.
        DB::statement(
            'ALTER TABLE stock_transfers ADD CONSTRAINT stock_transfers_distinct_endpoints_check '
            .'CHECK (source_location_id <> destination_location_id)'
        );

        Schema::create('stock_transfer_lines', function (Blueprint $table) {
            $table->id();
            $table->char('public_id', 26)->unique();

            $table->foreignId('stock_transfer_id')
                ->constrained('stock_transfers')
                ->cascadeOnDelete();

            $table->foreignId('item_variant_id')
                ->constrained('item_variants')
                ->cascadeOnDelete();

            $table->foreignId('entry_uom_id')
                ->constrained('units_of_measure')
                ->comment('UOM the operator captured the quantity in');

            $table->decimal('entry_quantity', 15, 4)->comment('Quantity in the entry UOM');
            $table->decimal('conversion_factor', 15, 6)->comment('entry UOM -> base UOM factor snapshot');
            $table->decimal('base_quantity', 15, 4)->comment('Quantity moved, in the Variant base UOM');
            $table->decimal('source_unit_cost', 15, 4)->nullable()
                ->comment('Source weighted-average cost snapshot used to blend the destination WAC at posting');

            $table->json('meta')->nullable();
            $table->timestamps();

            // Document-line uniqueness: one line per Variant per Transfer.
            $table->unique(['stock_transfer_id', 'item_variant_id']);
        });

        DB::statement('ALTER TABLE stock_transfer_lines ADD CONSTRAINT stock_transfer_lines_entry_qty_positive_check CHECK (entry_quantity > 0)');
        DB::statement('ALTER TABLE stock_transfer_lines ADD CONSTRAINT stock_transfer_lines_base_qty_positive_check CHECK (base_quantity > 0)');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE stock_transfer_lines DROP CONSTRAINT IF EXISTS stock_transfer_lines_base_qty_positive_check');
        DB::statement('ALTER TABLE stock_transfer_lines DROP CONSTRAINT IF EXISTS stock_transfer_lines_entry_qty_positive_check');
        Schema::dropIfExists('stock_transfer_lines');

        DB::statement('ALTER TABLE stock_transfers DROP CONSTRAINT IF EXISTS stock_transfers_distinct_endpoints_check');
        Schema::dropIfExists('stock_transfers');
    }
};

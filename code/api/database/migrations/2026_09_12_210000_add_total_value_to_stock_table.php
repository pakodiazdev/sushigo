<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // decimal(26,4): on_hand and weighted_avg_cost are each decimal(15,4)
        // (11 integer digits), so their product can need up to 22 integer
        // digits even when each factor individually fits its own column
        // (e.g. on_hand = weighted_avg_cost = 99999999999.9999, the maximum
        // each column allows, produces ~9.99999999999998e21) — 22 integer
        // digits plus the 4 fractional digits this column retains.
        Schema::table('stock', function (Blueprint $table) {
            $table->decimal('total_value', 26, 4)->default(0)->after('weighted_avg_cost')
                ->comment('Exact running value accumulator (#579) — on_hand * weighted_avg_cost, maintained additively so reversing a prior contribution never reconstructs it from the already-rounded weighted_avg_cost column.');
        });

        // Backfill from the existing (rounded) weighted_avg_cost — the best snapshot available for
        // rows that predate this accumulator. From this point forward every writer maintains it
        // exactly, so no further drift accumulates.
        DB::statement('UPDATE stock SET total_value = ROUND(on_hand * weighted_avg_cost, 4)');

        // Same NOT VALID + VALIDATE pattern as the on_hand/reserved invariants
        // (2026_08_12_210000): enforced on every write from here on without an
        // ACCESS EXCLUSIVE scan up front, then validated against the just-backfilled
        // rows under a lighter SHARE UPDATE EXCLUSIVE lock.
        DB::statement('ALTER TABLE stock ADD CONSTRAINT stock_total_value_nonnegative CHECK (total_value >= 0) NOT VALID');
        DB::statement('ALTER TABLE stock VALIDATE CONSTRAINT stock_total_value_nonnegative');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('ALTER TABLE stock DROP CONSTRAINT IF EXISTS stock_total_value_nonnegative');

        Schema::table('stock', function (Blueprint $table) {
            $table->dropColumn('total_value');
        });
    }
};

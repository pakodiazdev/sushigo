<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Repair any pre-existing rows that already violate the invariants below
        // (e.g. from the very race this migration closes) before the constraints
        // exist to reject them. Clamped in a single UPDATE so both columns are
        // evaluated against their original values together, avoiding a
        // partially-repaired row that would still violate reserved <= on_hand.
        DB::statement(
            'UPDATE stock '.
            'SET on_hand = GREATEST(on_hand, 0), '.
            'reserved = LEAST(GREATEST(reserved, 0), GREATEST(on_hand, 0)) '.
            'WHERE on_hand < 0 OR reserved < 0 OR reserved > on_hand'
        );

        // NOT VALID: enforced on every write from this point forward without an
        // ACCESS EXCLUSIVE table scan up front. VALIDATE CONSTRAINT below then
        // scans and confirms the (now-repaired) existing rows under a lighter
        // SHARE UPDATE EXCLUSIVE lock, so the invariant is guaranteed for every
        // row by the end of this migration, not just for future writes.
        DB::statement('ALTER TABLE stock ADD CONSTRAINT stock_on_hand_nonnegative CHECK (on_hand >= 0) NOT VALID');
        DB::statement('ALTER TABLE stock ADD CONSTRAINT stock_reserved_nonnegative CHECK (reserved >= 0) NOT VALID');
        DB::statement('ALTER TABLE stock ADD CONSTRAINT stock_reserved_not_exceeding_on_hand CHECK (reserved <= on_hand) NOT VALID');

        DB::statement('ALTER TABLE stock VALIDATE CONSTRAINT stock_on_hand_nonnegative');
        DB::statement('ALTER TABLE stock VALIDATE CONSTRAINT stock_reserved_nonnegative');
        DB::statement('ALTER TABLE stock VALIDATE CONSTRAINT stock_reserved_not_exceeding_on_hand');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('ALTER TABLE stock DROP CONSTRAINT IF EXISTS stock_reserved_not_exceeding_on_hand');
        DB::statement('ALTER TABLE stock DROP CONSTRAINT IF EXISTS stock_reserved_nonnegative');
        DB::statement('ALTER TABLE stock DROP CONSTRAINT IF EXISTS stock_on_hand_nonnegative');
    }
};

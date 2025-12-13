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
        // Drop the existing CHECK constraint
        DB::statement('ALTER TABLE inventory_locations DROP CONSTRAINT IF EXISTS inventory_locations_type_check');

        // Add the new CHECK constraint with WASTE included
        DB::statement("ALTER TABLE inventory_locations ADD CONSTRAINT inventory_locations_type_check CHECK (type IN ('MAIN', 'TEMP', 'KITCHEN', 'BAR', 'RETURN', 'WASTE'))");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop the constraint with WASTE
        DB::statement('ALTER TABLE inventory_locations DROP CONSTRAINT IF EXISTS inventory_locations_type_check');

        // Restore the original constraint without WASTE
        DB::statement("ALTER TABLE inventory_locations ADD CONSTRAINT inventory_locations_type_check CHECK (type IN ('MAIN', 'TEMP', 'KITCHEN', 'BAR', 'RETURN'))");
    }
};

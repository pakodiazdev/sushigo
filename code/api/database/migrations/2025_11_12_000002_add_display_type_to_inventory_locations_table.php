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
        // PostgreSQL syntax: Add DISPLAY value to the check constraint
        // First, we need to drop the existing constraint and recreate it
        DB::statement("ALTER TABLE inventory_locations DROP CONSTRAINT IF EXISTS inventory_locations_type_check");
        DB::statement("ALTER TABLE inventory_locations ADD CONSTRAINT inventory_locations_type_check CHECK (type IN ('MAIN', 'TEMP', 'KITCHEN', 'BAR', 'RETURN', 'WASTE', 'DISPLAY'))");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove DISPLAY from the constraint
        DB::statement("ALTER TABLE inventory_locations DROP CONSTRAINT IF EXISTS inventory_locations_type_check");
        DB::statement("ALTER TABLE inventory_locations ADD CONSTRAINT inventory_locations_type_check CHECK (type IN ('MAIN', 'TEMP', 'KITCHEN', 'BAR', 'RETURN', 'WASTE'))");
    }
};

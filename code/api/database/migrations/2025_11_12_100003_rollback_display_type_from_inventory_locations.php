<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Remove DISPLAY from location_type enum added in 2025_11_12_000002
     * to align with original architecture design.
     */
    public function up(): void
    {
        // First, update any existing DISPLAY or WASTE records to TEMP
        DB::statement("UPDATE inventory_locations SET type = 'TEMP' WHERE type IN ('DISPLAY', 'WASTE')");
        
        // Then remove DISPLAY and WASTE from the constraint - back to original types
        DB::statement("ALTER TABLE inventory_locations DROP CONSTRAINT IF EXISTS inventory_locations_type_check");
        DB::statement("ALTER TABLE inventory_locations ADD CONSTRAINT inventory_locations_type_check CHECK (type IN ('MAIN', 'TEMP', 'KITCHEN', 'BAR', 'RETURN'))");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Re-add DISPLAY and WASTE to the constraint
        DB::statement("ALTER TABLE inventory_locations DROP CONSTRAINT IF EXISTS inventory_locations_type_check");
        DB::statement("ALTER TABLE inventory_locations ADD CONSTRAINT inventory_locations_type_check CHECK (type IN ('MAIN', 'TEMP', 'KITCHEN', 'BAR', 'RETURN', 'WASTE', 'DISPLAY'))");
    }
};

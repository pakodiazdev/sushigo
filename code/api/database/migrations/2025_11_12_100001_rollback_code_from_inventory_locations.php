<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Remove the 'code' field added in 2025_11_12_000001
     * to align with original architecture design.
     */
    public function up(): void
    {
        Schema::table('inventory_locations', function (Blueprint $table) {
            $table->dropIndex(['code']);
            $table->dropColumn('code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inventory_locations', function (Blueprint $table) {
            $table->string('code', 50)->nullable()->after('operating_unit_id')
                ->comment('Unique code for quick identification (e.g., MESA-REC-01)');
            $table->index('code');
        });
    }
};

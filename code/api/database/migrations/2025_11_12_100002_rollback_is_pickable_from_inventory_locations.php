<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Remove the 'is_pickable' field added in 2025_11_12_000003
     * to align with original architecture design.
     */
    public function up(): void
    {
        Schema::table('inventory_locations', function (Blueprint $table) {
            $table->dropIndex(['is_active', 'is_pickable']);
            $table->dropColumn('is_pickable');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inventory_locations', function (Blueprint $table) {
            $table->boolean('is_pickable')->default(true)->after('is_active')
                ->comment('Whether this location can be used for automatic picking/reservation');
            $table->index(['is_active', 'is_pickable']);
        });
    }
};

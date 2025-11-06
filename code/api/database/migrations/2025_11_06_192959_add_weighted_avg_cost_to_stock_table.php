<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('stock', function (Blueprint $table) {
            $table->decimal('weighted_avg_cost', 15, 4)->default(0)->after('available')->comment('Weighted average unit cost');
            $table->index(['weighted_avg_cost']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stock', function (Blueprint $table) {
            $table->dropIndex(['weighted_avg_cost']);
            $table->dropColumn('weighted_avg_cost');
        });
    }
};

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
        Schema::table('stock_movement_lines', function (Blueprint $table) {
            $table->decimal('sale_price', 15, 4)->nullable()->after('line_total')
                ->comment('Sale price per unit (for outbound movements)');
            $table->decimal('sale_total', 15, 4)->nullable()->after('sale_price')
                ->comment('Total sale amount for this line (sale_price * qty)');
            $table->decimal('profit_margin', 15, 4)->nullable()->after('sale_total')
                ->comment('Profit per unit (sale_price - unit_cost)');
            $table->decimal('profit_total', 15, 4)->nullable()->after('profit_margin')
                ->comment('Total profit for this line (profit_margin * base_qty)');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stock_movement_lines', function (Blueprint $table) {
            $table->dropColumn(['sale_price', 'sale_total', 'profit_margin', 'profit_total']);
        });
    }
};

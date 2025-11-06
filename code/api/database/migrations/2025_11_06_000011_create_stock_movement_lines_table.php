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
        Schema::create('stock_movement_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_movement_id')
                ->constrained('stock_movements')
                ->cascadeOnDelete()
                ->comment('Parent stock movement');

            $table->foreignId('item_variant_id')
                ->constrained('item_variants')
                ->cascadeOnDelete()
                ->comment('Item variant in this line');

            $table->foreignId('uom_id')
                ->constrained('units_of_measure')
                ->comment('Unit of measure used in transaction');

            $table->decimal('qty', 15, 4)->comment('Quantity in transaction unit');
            $table->decimal('base_qty', 15, 4)->comment('Quantity converted to base unit');
            $table->decimal('conversion_factor', 15, 6)->default(1)->comment('Applied conversion factor');

            $table->decimal('unit_cost', 15, 4)->nullable()->comment('Cost per unit (for entries)');
            $table->decimal('line_total', 15, 4)->nullable()->comment('Total cost for this line');

            $table->json('meta')->nullable()->comment('Additional metadata');
            $table->timestamps();

            $table->index(['stock_movement_id']);
            $table->index(['item_variant_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock_movement_lines');
    }
};

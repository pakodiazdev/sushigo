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
        Schema::create('stock', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inventory_location_id')
                ->constrained('inventory_locations')
                ->cascadeOnDelete()
                ->comment('Inventory location reference');

            $table->foreignId('item_variant_id')
                ->constrained('item_variants')
                ->cascadeOnDelete()
                ->comment('Item variant reference');

            $table->decimal('on_hand', 15, 4)->default(0)->comment('Available quantity in base unit');
            $table->decimal('reserved', 15, 4)->default(0)->comment('Reserved quantity in base unit');
            $table->decimal('available', 15, 4)
                ->storedAs('on_hand - reserved')
                ->comment('Computed available quantity');

            $table->json('meta')->nullable()->comment('Additional metadata');
            $table->timestamps();

            $table->unique(['inventory_location_id', 'item_variant_id'], 'unique_stock_per_location');
            $table->index(['item_variant_id']);
            $table->index(['on_hand']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock');
    }
};

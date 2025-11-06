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
        Schema::create('item_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_id')
                ->constrained('items')
                ->cascadeOnDelete()
                ->comment('Parent item reference');

            $table->foreignId('uom_id')
                ->constrained('units_of_measure')
                ->comment('Base unit of measure for this variant');

            $table->string('code', 100)->unique()->comment('Unique variant code');
            $table->string('name', 255)->comment('Variant display name');
            $table->text('description')->nullable()->comment('Variant description');

            $table->boolean('track_lot')->default(false)->comment('Whether to track lot numbers');
            $table->boolean('track_serial')->default(false)->comment('Whether to track serial numbers');

            $table->decimal('last_unit_cost', 15, 4)->default(0)->comment('Last acquisition cost per base unit');
            $table->decimal('avg_unit_cost', 15, 4)->default(0)->comment('Weighted average cost per base unit');

            $table->decimal('sale_price', 15, 4)->nullable()->comment('Default sale price');
            $table->decimal('min_stock', 15, 4)->default(0)->comment('Minimum stock alert level');
            $table->decimal('max_stock', 15, 4)->default(0)->comment('Maximum stock alert level');

            $table->boolean('is_active')->default(true)->comment('Variant active status');
            $table->json('meta')->nullable()->comment('Additional metadata');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['item_id', 'is_active']);
            $table->index('code');
            $table->index(['uom_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('item_variants');
    }
};

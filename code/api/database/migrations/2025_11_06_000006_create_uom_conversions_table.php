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
        Schema::create('uom_conversions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('from_uom_id')
                ->constrained('units_of_measure')
                ->cascadeOnDelete()
                ->comment('Source unit of measure');
            
            $table->foreignId('to_uom_id')
                ->constrained('units_of_measure')
                ->cascadeOnDelete()
                ->comment('Target unit of measure');
            
            $table->decimal('factor', 15, 6)->comment('Conversion factor (from * factor = to)');
            $table->decimal('tolerance', 8, 4)->default(0)->comment('Acceptable variance percentage');
            $table->boolean('is_active')->default(true)->comment('Conversion active status');
            $table->json('meta')->nullable()->comment('Additional metadata');
            $table->timestamps();

            $table->unique(['from_uom_id', 'to_uom_id'], 'unique_conversion_pair');
            $table->index(['is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('uom_conversions');
    }
};

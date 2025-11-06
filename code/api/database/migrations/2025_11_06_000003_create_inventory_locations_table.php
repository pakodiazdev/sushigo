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
        Schema::create('inventory_locations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('operating_unit_id')
                ->constrained('operating_units')
                ->cascadeOnDelete()
                ->comment('Parent operating unit reference');
            
            $table->string('name', 255)->comment('Location display name');
            $table->enum('type', [
                'MAIN',
                'TEMP',
                'KITCHEN',
                'BAR',
                'RETURN',
                'WASTE'
            ])->comment('Type of inventory location');
            
            $table->boolean('is_primary')->default(false)->comment('Primary location flag for unit');
            $table->integer('priority')->default(0)->comment('Sort priority for display');
            $table->json('meta')->nullable()->comment('Additional metadata');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['operating_unit_id', 'is_primary']);
            $table->index(['type', 'is_primary']);
            $table->unique(['operating_unit_id', 'name'], 'unique_location_per_unit');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_locations');
    }
};

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
        Schema::create('items', function (Blueprint $table) {
            $table->id();
            $table->string('sku', 100)->unique()->comment('Stock Keeping Unit code');
            $table->string('name', 255)->comment('Item display name');
            $table->text('description')->nullable()->comment('Item description');
            $table->enum('type', [
                'INSUMO',
                'PRODUCTO',
                'ACTIVO'
            ])->comment('Item classification type');
            
            $table->boolean('is_stocked')->default(true)->comment('Whether item is tracked in inventory');
            $table->boolean('is_perishable')->default(false)->comment('Whether item has expiration date');
            $table->boolean('is_active')->default(true)->comment('Item active status');
            $table->json('meta')->nullable()->comment('Additional metadata');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['type', 'is_active']);
            $table->index(['is_stocked', 'is_active']);
            $table->index('sku');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('items');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_categories', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 26)->unique();
            $table->string('name', 255)->comment('Inventory taxonomy name (e.g. Beverages, Instant Noodles)');
            $table->integer('position')->default(0)->comment('Display order among categories');
            $table->boolean('is_active')->default(true)->comment('Whether this category can be assigned to new Products');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['is_active', 'position']);
        });

        // Partial unique index instead of a plain unique() column: name must
        // only be unique among non-deleted rows, matching
        // StoreInventoryCategoryRequest's Rule::unique(...)->whereNull('deleted_at')
        // — otherwise a deleted category's name could never be reused.
        DB::statement('create unique index inventory_categories_name_unique on inventory_categories (name) where deleted_at is null');
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_categories');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->foreignId('brand_id')->nullable()->after('sku')
                ->constrained('brands')->nullOnDelete()
                ->comment('Optional brand — nullable at the DB level and optional in app-layer validation too, even for type=PRODUCTO');
            $table->foreignId('inventory_category_id')->nullable()->after('brand_id')
                ->constrained('inventory_categories')->nullOnDelete()
                ->comment('Inventory taxonomy — nullable at the DB level, required by app-layer validation only for type=PRODUCTO');

            $table->index(['brand_id', 'is_active']);
            $table->index(['inventory_category_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->dropConstrainedForeignId('brand_id');
            $table->dropConstrainedForeignId('inventory_category_id');
        });
    }
};

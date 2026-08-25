<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('variant_prices', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 26)->unique();
            $table->foreignId('item_variant_id')->constrained('item_variants')->cascadeOnDelete();
            $table->foreignId('price_list_id')->constrained('price_lists')->cascadeOnDelete();
            $table->decimal('price', 15, 4);
            $table->date('effective_from');
            $table->date('effective_to')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['item_variant_id', 'price_list_id']);
            $table->index('is_active');
        });

        DB::statement('ALTER TABLE variant_prices ADD CONSTRAINT chk_vp_effective_range CHECK (effective_to IS NULL OR effective_to >= effective_from)');
        DB::statement('ALTER TABLE variant_prices ADD CONSTRAINT chk_vp_price_non_negative CHECK (price >= 0)');
    }

    public function down(): void
    {
        Schema::dropIfExists('variant_prices');
    }
};

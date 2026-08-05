<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dishes', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 26)->unique();
            $table->foreignId('dish_category_id')
                ->constrained('dish_categories')
                ->cascadeOnDelete()
                ->comment('Menu category this dish belongs to');

            $table->string('name', 255)->comment('Dish display name');
            $table->text('description')->nullable()->comment('Dish description');
            $table->decimal('base_price', 10, 2)->comment('Base price before extras');
            $table->boolean('is_active')->default(true)->comment('Whether this dish is currently offered');
            $table->integer('position')->default(0)->comment('Display order within its category');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['dish_category_id', 'is_active', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dishes');
    }
};

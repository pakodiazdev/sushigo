<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dish_extra_options', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 26)->unique();
            $table->foreignId('dish_extra_group_id')
                ->constrained('dish_extra_groups')
                ->cascadeOnDelete()
                ->comment('Extra group this option belongs to');

            $table->string('name', 255)->comment('Option display name');
            $table->decimal('price_delta', 10, 2)->default(0)->comment('Added to the dish base_price when selected');
            $table->boolean('is_active')->default(true)->comment('Whether this option is currently offered');
            $table->integer('position')->default(0)->comment('Display order within its group');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['dish_extra_group_id', 'is_active', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dish_extra_options');
    }
};

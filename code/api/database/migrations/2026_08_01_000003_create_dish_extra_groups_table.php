<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dish_extra_groups', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 26)->unique();
            $table->foreignId('dish_id')
                ->constrained('dishes')
                ->cascadeOnDelete()
                ->comment('Dish this extra group belongs to (not shared across dishes)');

            $table->string('name', 255)->comment('Extra group display name, e.g. "Elige tu salsa"');
            $table->boolean('is_required')->default(false)->comment('Whether the customer must pick an option');
            $table->enum('selection_type', ['SINGLE', 'MULTIPLE'])->comment('Whether one or many options can be selected');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['dish_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dish_extra_groups');
    }
};

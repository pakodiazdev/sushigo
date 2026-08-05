<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dish_categories', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 26)->unique();
            $table->string('name', 255)->comment('Menu category display name');
            $table->integer('position')->default(0)->comment('Display order among categories');
            $table->boolean('is_active')->default(true)->comment('Whether this category is currently offered');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['is_active', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dish_categories');
    }
};

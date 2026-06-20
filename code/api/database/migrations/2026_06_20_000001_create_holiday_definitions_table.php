<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('holiday_definitions', function (Blueprint $table) {
            $table->id();
            $table->string('name', 255);
            $table->string('description', 500)->nullable();
            $table->enum('type', ['obligatorio', 'asueto', 'opcional']);
            $table->decimal('pay_multiplier', 4, 2);
            $table->boolean('is_annual')->default(false);
            $table->enum('recurrence_type', ['fixed', 'nth_weekday', 'floating', 'none']);
            $table->json('recurrence_config');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('holiday_definitions');
    }
};

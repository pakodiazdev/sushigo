<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leave_types', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('code', 30)->unique();
            $table->enum('calculation_mode', ['FIXED_PERCENTAGE', 'PROPORTIONAL_HOURS'])->default('FIXED_PERCENTAGE');
            $table->decimal('default_pay_percentage', 5, 2)->default(100.00);
            $table->enum('default_rest_day_factor', ['FULL', 'PROPORTIONAL', 'NONE'])->default('PROPORTIONAL');
            $table->boolean('counts_for_bonus')->default(true);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leave_types');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('punctuality_bonus_groups', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 26)->unique();
            $table->string('name', 50);
            $table->decimal('weekly_bonus_amount', 10, 2);
            $table->unsignedSmallInteger('working_days_divisor');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('punctuality_bonus_groups');
    }
};

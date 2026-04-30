<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('punctuality_ranges', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 26)->unique();
            $table->unsignedInteger('min_seconds')->unique();
            $table->unsignedInteger('max_seconds')->nullable();
            $table->decimal('bonus_percentage', 5, 2);
            $table->unsignedSmallInteger('sort_order')->unique();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('punctuality_ranges');
    }
};

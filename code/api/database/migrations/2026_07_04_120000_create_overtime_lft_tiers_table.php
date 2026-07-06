<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('overtime_lft_tiers', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 26)->unique();
            $table->decimal('factor', 5, 2);
            $table->decimal('up_to_hours', 5, 2)->nullable()->unique();
            $table->unsignedSmallInteger('sort_order')->unique();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('overtime_lft_tiers');
    }
};

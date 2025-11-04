<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('seeder_logs', function (Blueprint $table) {
            $table->id();
            $table->string('seeder_class')->unique();
            $table->string('environment');
            $table->boolean('is_locked')->default(false);
            $table->timestamp('executed_at');
            $table->timestamp('locked_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seeder_logs');
    }
};

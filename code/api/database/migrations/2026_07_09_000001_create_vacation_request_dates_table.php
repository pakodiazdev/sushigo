<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vacation_request_dates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vacation_request_id')->constrained('vacation_requests')->cascadeOnDelete();
            $table->date('date');
            $table->timestamps();

            $table->unique(['vacation_request_id', 'date']);
            $table->index('date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vacation_request_dates');
    }
};

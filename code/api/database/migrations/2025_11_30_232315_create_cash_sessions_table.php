<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('cash_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cash_register_id')->constrained('cash_registers')->onDelete('cascade');
            $table->date('operating_date')->comment('Operating date for this session');
            $table->enum('status', ['DRAFT', 'POSTED'])->default('DRAFT');
            $table->decimal('opening_balance', 12, 4)->nullable()->comment('Opening cash balance');
            $table->decimal('closing_balance', 12, 4)->default(0)->comment('Calculated closing balance');
            $table->json('meta')->nullable()->comment('External batch IDs, notes, etc.');
            $table->timestamps();

            // Indexes
            $table->index('cash_register_id');
            $table->index('operating_date');
            $table->index('status');
            $table->index(['cash_register_id', 'operating_date']);

            // Unique constraint: one session per register per day
            $table->unique(['cash_register_id', 'operating_date'], 'unique_register_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cash_sessions');
    }
};

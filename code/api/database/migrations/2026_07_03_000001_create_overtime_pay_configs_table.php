<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('overtime_pay_configs', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 26)->unique();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->enum('valuation_method', ['LFT_PROPORTIONAL', 'AGREED_RATE']);
            $table->decimal('lft_factor', 8, 2)->nullable();
            $table->decimal('hourly_rate', 8, 2)->nullable();
            $table->date('effective_from');
            $table->date('effective_to')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('overtime_pay_configs');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pay_period_lines', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 26)->unique();
            $table->foreignId('pay_period_employee_id')->constrained()->cascadeOnDelete();
            $table->date('date')->nullable();
            $table->enum('concept', ['BASE_PAY', 'LATE_DEDUCTION', 'UNPAID_LEAVE', 'OVERTIME', 'EXTRA_DAY', 'PUNCTUALITY_BONUS', 'HOLIDAY', 'OTHER']);
            $table->string('description');
            $table->decimal('amount', 10, 2);
            $table->unsignedInteger('minutes')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pay_period_lines');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pay_period_employees', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 26)->unique();
            $table->foreignId('pay_period_id')->constrained()->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->decimal('base_pay', 10, 2)->default(0);
            $table->decimal('late_deductions', 10, 2)->default(0);
            $table->decimal('unpaid_leave_deductions', 10, 2)->default(0);
            $table->decimal('overtime_pay', 10, 2)->default(0);
            $table->decimal('extra_day_pay', 10, 2)->default(0);
            $table->decimal('punctuality_bonus', 10, 2)->default(0);
            $table->decimal('holiday_pay', 10, 2)->default(0);
            $table->decimal('other_adjustments', 10, 2)->default(0);
            $table->decimal('total_pay', 10, 2)->default(0);
            $table->decimal('free_hours_earned', 8, 2)->default(0);
            $table->json('daily_snapshot')->nullable();
            $table->timestamps();

            $table->unique(['pay_period_id', 'employee_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pay_period_employees');
    }
};

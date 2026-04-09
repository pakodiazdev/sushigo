<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leaves', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 26)->unique();
            $table->foreignId('employee_id')->constrained('employees');
            $table->foreignId('leave_type_id')->constrained('leave_types');
            $table->date('start_date');
            $table->date('end_date');

            // Pay and rest-day overrides (NULL = use leave type defaults)
            $table->decimal('pay_percentage', 5, 2)->nullable();
            $table->enum('rest_day_factor', ['FULL', 'PROPORTIONAL', 'NONE'])->nullable();

            // Time tracking fields (only for PROPORTIONAL_HOURS types)
            $table->enum('time_mode', ['SCHEDULED', 'OPEN_ENDED'])->nullable();
            $table->time('scheduled_start_time')->nullable();
            $table->time('scheduled_end_time')->nullable();
            $table->time('actual_start_time')->nullable();
            $table->time('actual_end_time')->nullable();
            $table->integer('actual_duration_minutes')->nullable();

            // Workflow
            $table->enum('status', ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'])->default('PENDING');
            $table->foreignId('requested_by')->constrained('users');
            $table->foreignId('approved_by')->nullable()->constrained('users');
            $table->dateTime('approved_at')->nullable();
            $table->text('notes')->nullable();

            $table->timestamps();

            $table->index(['employee_id', 'start_date', 'end_date']);
            $table->index(['employee_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leaves');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendances', function (Blueprint $table) {
            $table->id();

            $table->foreignId('employee_id')
                ->constrained('employees')
                ->restrictOnDelete();

            $table->date('date')->comment('Work day date. Combined with employee_id forms the unique key.');

            $table->dateTime('check_in')->nullable()->comment('Actual clock-in time.');
            $table->dateTime('check_out')->nullable()->comment('Actual clock-out time.');
            $table->dateTime('lunch_start')->nullable()->comment('Lunch break start (optional).');
            $table->dateTime('lunch_end')->nullable()->comment('Lunch break return.');

            $table->unsignedInteger('entry_late_seconds')->default(0)
                ->comment('Entry tardiness in seconds (check_in − expected_start). 0 if on time.');
            $table->unsignedInteger('lunch_late_seconds')->default(0)
                ->comment('Lunch return tardiness in seconds (lunch_end − expected_lunch_end). 0 if on time.');

            $table->unsignedInteger('net_worked_minutes')->nullable()
                ->comment('Net minutes worked excluding lunch. Calculated on check-out.');
            $table->unsignedInteger('overtime_minutes')->default(0)
                ->comment('Extra minutes worked beyond expected_end. Calculated on check-out.');

            $table->boolean('overtime_authorized')->default(false)
                ->comment('Whether the Manager authorized overtime pay for this day.');
            $table->foreignId('overtime_authorized_by')->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->dateTime('overtime_authorized_at')->nullable();

            $table->enum('day_status', ['WORKED', 'DAY_OFF', 'LEAVE', 'VACATION', 'HOLIDAY', 'ABSENCE', 'EXTRA'])
                ->comment('Day status: WORKED, DAY_OFF, LEAVE, VACATION, HOLIDAY, ABSENCE, EXTRA.');

            $table->foreignId('confirmed_by')->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->json('meta')->nullable()->comment('Additional data for extensibility.');

            $table->timestamps();

            $table->unique(['employee_id', 'date'], 'attendances_employee_date_unique');
            $table->index('date', 'attendances_date_index');
            $table->index('day_status', 'attendances_day_status_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendances');
    }
};

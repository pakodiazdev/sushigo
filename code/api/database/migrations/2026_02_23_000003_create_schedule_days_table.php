<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('schedule_days', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_schedule_id')
                ->constrained('employee_schedules')
                ->cascadeOnDelete()
                ->comment('Parent schedule. Deleted when the schedule is hard-deleted.');
            $table->smallInteger('day_of_week')
                ->comment('ISO 8601 day: 1=Monday, 2=Tuesday, …, 7=Sunday.');
            $table->boolean('is_day_off')->default(false)
                ->comment('TRUE when this is a scheduled rest day. Time fields should be NULL.');
            $table->time('expected_start')->nullable()
                ->comment('Expected clock-in time. NULL when is_day_off = true.');
            $table->time('expected_lunch_start')->nullable()
                ->comment('Expected start of lunch break. Used to calculate net working duration.');
            $table->time('expected_lunch_end')->nullable()
                ->comment('Expected return from lunch. Used to calculate lunch tardiness (RF-14).');
            $table->time('expected_end')->nullable()
                ->comment('Expected clock-out time. NULL when is_day_off = true.');
            $table->timestamps();

            // Enforce one configuration per day per schedule
            $table->unique(['employee_schedule_id', 'day_of_week'], 'schedule_days_unique_dow');

            // Index for direct day lookups (dayConfig() queries)
            $table->index(['employee_schedule_id', 'day_of_week'], 'schedule_days_lookup_index');
        });

        // ISO 8601 range guard
        DB::statement('ALTER TABLE schedule_days ADD CONSTRAINT schedule_days_dow_range_check CHECK (day_of_week BETWEEN 1 AND 7)');
    }

    public function down(): void
    {
        Schema::dropIfExists('schedule_days');
    }
};

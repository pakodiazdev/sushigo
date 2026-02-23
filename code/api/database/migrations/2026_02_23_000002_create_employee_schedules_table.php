<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employee_schedules', function (Blueprint $table) {
            $table->id();
            $table->char('public_id', 26)->unique()->comment('ULID — safe for external API exposure.');
            $table->foreignId('employment_period_id')
                ->constrained('employment_periods')
                ->restrictOnDelete()
                ->comment('The employment period this schedule belongs to.');
            $table->string('name', 100)->comment('Descriptive label, e.g. "Full schedule Jan 2026".');
            $table->date('effective_from')->comment('Date from which this schedule applies (inclusive).');
            $table->date('effective_to')->nullable()->comment('Last date this schedule applies (inclusive). NULL = currently active.');
            $table->enum('workday_type', ['FULL', 'PARTIAL'])
                ->comment('FULL: same times every day. PARTIAL: variable times per day.');
            $table->smallInteger('working_days_per_week')->default(6)
                ->comment('Number of working days per week; used for punctuality bonus proration.');
            $table->timestamps();
            $table->softDeletes();

            // Optimise effective() scope: most queries filter by period + date range
            $table->index(['employment_period_id', 'effective_from', 'effective_to'], 'schedules_period_effective_index');
        });

        // Check constraint: effective_to must not be before effective_from
        DB::statement('ALTER TABLE employee_schedules ADD CONSTRAINT employee_schedules_effective_range_check CHECK (effective_to IS NULL OR effective_to >= effective_from)');

        // Partial unique index (PostgreSQL): only one active (open-ended) schedule per employment period.
        // Soft-deleted rows (deleted_at IS NOT NULL) are excluded so a replacement can be created.
        DB::statement('CREATE UNIQUE INDEX employee_schedules_period_active_unique ON employee_schedules (employment_period_id) WHERE effective_to IS NULL AND deleted_at IS NULL');
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_schedules');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wage_histories', function (Blueprint $table) {
            $table->id();
            $table->char('public_id', 26)->unique()->comment('ULID — safe for external API exposure.');
            $table->foreignId('employee_id')
                ->constrained('employees')
                ->restrictOnDelete();
            $table->decimal('hourly_rate', 10, 2)->comment('Hourly rate in MXN. Must be > 0. Atomic unit of compensation.');
            $table->decimal('weekly_scheduled_hours', 5, 2)->comment('Contracted weekly hours (snapshot of schedule). Must be > 0.');
            $table->date('effective_from')->comment('Date from which this wage applies (inclusive).');
            $table->date('effective_to')->nullable()->comment('Last date this wage applies (inclusive). NULL = currently active.');
            $table->timestamps();
            $table->softDeletes();

            // Optimise effective() scope: most queries filter by employee + date range
            $table->index(['employee_id', 'effective_from', 'effective_to']);
        });

        // Check constraint: effective_to must not be before effective_from
        DB::statement('ALTER TABLE wage_histories ADD CONSTRAINT wage_histories_effective_range_check CHECK (effective_to IS NULL OR effective_to >= effective_from)');

        // Partial unique index (PostgreSQL): only one active (open-ended) wage per employee.
        // Soft-deleted rows (deleted_at IS NOT NULL) are excluded so a replacement can be created.
        DB::statement('CREATE UNIQUE INDEX wage_histories_employee_active_unique ON wage_histories (employee_id) WHERE effective_to IS NULL AND deleted_at IS NULL');
    }

    public function down(): void
    {
        Schema::dropIfExists('wage_histories');
    }
};

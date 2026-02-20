<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
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
            $table->decimal('daily_wage', 10, 2)->comment('Daily wage in MXN. Must be > 0.');
            $table->date('effective_from')->comment('Date from which this wage applies (inclusive).');
            $table->date('effective_to')->nullable()->comment('Last date this wage applies (inclusive). NULL = currently active.');
            $table->timestamps();
            $table->softDeletes();

            // Optimise effective() scope: most queries filter by employee + date range
            $table->index(['employee_id', 'effective_from', 'effective_to']);

            // Ensure effective_to is never before effective_from at the DB level
            $table->check('effective_to IS NULL OR effective_to >= effective_from');

            // Prevent two open-ended (currently active) wages for the same employee.
            // Uses a partial unique index (PostgreSQL/SQLite): only live rows where
            // effective_to IS NULL are considered; soft-deleted rows (deleted_at IS NOT NULL)
            // are excluded so a replacement active wage can be created after a soft-delete.
            $table->unique(['employee_id'])->whereNull('effective_to')->whereNull('deleted_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wage_histories');
    }
};

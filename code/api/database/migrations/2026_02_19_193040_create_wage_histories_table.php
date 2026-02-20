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
            $table->foreignId('employee_id')
                ->constrained('employees')
                ->cascadeOnDelete();
            $table->decimal('daily_wage', 10, 2)->comment('Daily wage in MXN. Must be > 0.');
            $table->date('effective_from')->comment('Date from which this wage applies (inclusive).');
            $table->date('effective_to')->nullable()->comment('Last date this wage applies (inclusive). NULL = currently active.');
            $table->timestamps();

            // Optimise effective() scope: most queries filter by employee + date range
            $table->index(['employee_id', 'effective_from', 'effective_to']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wage_histories');
    }
};

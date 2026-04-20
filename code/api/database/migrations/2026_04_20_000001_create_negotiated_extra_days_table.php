<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('negotiated_extra_days', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 26)->unique();
            $table->foreignId('employee_id')->constrained('employees');
            $table->foreignId('branch_id')->constrained('branches');
            $table->date('date');
            $table->decimal('agreed_daily_wage', 10, 4);
            $table->decimal('prima_percent', 7, 4);  // matches decimal:4 model cast; max 999.9999 (0–200 range)
            $table->decimal('prima_amount', 10, 4);
            $table->foreignId('approved_by')->constrained('users');
            $table->string('status')->default('APPROVED');
            $table->text('notes')->nullable();

            $table->timestamps();
            $table->softDeletes();
        });

        // Partial unique index: allows soft-deleted records to coexist with new ones
        // for the same employee+date without violating the constraint.
        DB::statement(
            'CREATE UNIQUE INDEX negotiated_extra_days_employee_date_unique '
            .'ON negotiated_extra_days (employee_id, date) WHERE deleted_at IS NULL'
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('negotiated_extra_days');
    }
};

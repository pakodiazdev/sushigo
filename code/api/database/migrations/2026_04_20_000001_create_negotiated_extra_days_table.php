<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
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
            $table->decimal('prima_percent', 5, 2);
            $table->decimal('prima_amount', 10, 4);
            $table->foreignId('approved_by')->constrained('users');
            $table->string('status')->default('APPROVED');
            $table->text('notes')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->unique(['employee_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('negotiated_extra_days');
    }
};

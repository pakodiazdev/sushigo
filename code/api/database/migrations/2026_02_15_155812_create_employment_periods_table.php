<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employment_periods', function (Blueprint $table) {
            $table->id();
            $table->char('public_id', 26)->unique();
            $table->foreignId('employee_id')
                ->constrained('employees')
                ->cascadeOnDelete();
            $table->foreignId('branch_id')
                ->constrained('branches')
                ->cascadeOnDelete();
            $table->date('start_date');
            $table->date('end_date')->nullable()->comment('NULL = currently active');
            $table->string('termination_reason')->nullable();
            $table->boolean('is_active')->default(true);
            $table->json('meta')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['employee_id', 'is_active']);
            $table->index('branch_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employment_periods');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vacation_requests', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 26)->unique();
            $table->foreignId('employee_id')->constrained('employees');
            $table->foreignId('vacation_entitlement_id')->constrained('vacation_entitlements');
            $table->date('start_date');
            $table->date('end_date');
            $table->smallInteger('days_count');

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
        Schema::dropIfExists('vacation_requests');
    }
};

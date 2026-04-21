<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employee_requests', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 26)->unique();
            $table->foreignId('employee_id')->constrained('employees');
            $table->enum('type', ['EXTRA_DAY', 'LEAVE', 'VACATION', 'SCHEDULE_CHANGE']);
            $table->enum('status', ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'])->default('PENDING');
            $table->nullableMorphs('requestable');
            $table->json('payload');
            $table->foreignId('requested_by')->constrained('users');
            $table->foreignId('approved_by')->nullable()->constrained('users');
            $table->dateTime('approved_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['employee_id', 'type', 'status']);
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_requests');
    }
};

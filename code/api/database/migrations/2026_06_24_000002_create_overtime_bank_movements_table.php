<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('overtime_bank_movements', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 26)->unique();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->foreignId('attendance_id')->nullable()->constrained()->nullOnDelete();
            $table->date('date');
            // EARNED: minutes added to bank; PAID: minutes paid out; EXPIRED: minutes removed
            $table->enum('type', ['EARNED', 'PAID', 'EXPIRED', 'TRANSFERRED']);
            $table->unsignedInteger('minutes');
            $table->string('reference')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('overtime_bank_movements');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('punctuality_exceptions', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 26)->unique();
            $table->unsignedBigInteger('employee_id');
            // 0=Sunday … 6=Saturday (Carbon convention); null = applies every day of week
            $table->tinyInteger('day_of_week')->unsigned()->nullable();
            $table->decimal('forced_percentage', 5, 2);
            $table->date('effective_from');
            $table->date('effective_to')->nullable();
            $table->text('reason')->nullable();
            $table->timestamps();
        });

        Schema::table('punctuality_exceptions', function (Blueprint $table) {
            $table->foreign('employee_id')->references('id')->on('employees')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('punctuality_exceptions');
    }
};

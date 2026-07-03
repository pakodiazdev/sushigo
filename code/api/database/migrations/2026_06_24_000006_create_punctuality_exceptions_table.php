<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('punctuality_exceptions', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 26)->unique();
            $table->unsignedBigInteger('employee_id');
            // ISO 8601 day: 1=Monday … 7=Sunday — matches schedule_days/schedule_day_overrides
            // and every caller's Carbon::dayOfWeekIso(). Null = applies every day of week.
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

        DB::statement('ALTER TABLE punctuality_exceptions ADD CONSTRAINT punctuality_exceptions_dow_range_check CHECK (day_of_week BETWEEN 1 AND 7)');
    }

    public function down(): void
    {
        Schema::dropIfExists('punctuality_exceptions');
    }
};
